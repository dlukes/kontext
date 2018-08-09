# Copyright (c) 2018 Charles University, Faculty of Arts,
#                    Institute of the Czech National Corpus
# Copyright (c) 2018 Tomas Machalek <tomas.machalek@gmail.com>
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; version 2
# dated June, 1991.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

"""
This module provides:

1) KonServer client used by KonText to send tasks and get results
2) KonServer worker logic command line executor; this is
   used by KonServer to initialize and command workers defined
   by KonText's worker.py module.

Sample config:

SERVER = '10.0.3.188'
PORT = 8083
PATH = '/kontext/atn'
HTTP_CONNECTION_TIMEOUT = 5
RESULT_WAIT_MAX_TIME = 120
"""

from functools import wraps, partial
import logging
import sys
import json
import httplib
import inspect
import time


class Request(object):
    """
    Celery-like request object stripped to the minimum
    required by KonText.
    """

    def __init__(self, task_id):
        self.id = task_id


class APIConnection(object):
    """
    A base class for both KonServer client and server where
    both must be able to communicate with KonServer via
    its HTTP API.
    """

    def __init__(self, conf):
        self._conf = conf

    def _create_connection(self):
        return httplib.HTTPConnection(self._conf.SERVER,
                                      port=self._conf.PORT,
                                      timeout=self._conf.HTTP_CONNECTION_TIMEOUT)

    @property
    def conf(self):
        return self._conf


class ResultException(Exception):
    pass


class Result(APIConnection):

    INITIAL_WAIT_STEP = 0.5
    WAIT_STEP_INCREASE_RATIO = 1.09

    def __init__(self, conf, data):
        """
        {u'status': 0, u'updated': 0, u'created': 1533630693, , u'error': u'', u'fn': u'worker.conc_register'}
        """
        super(Result, self).__init__(conf)
        self._status = None
        self._created = None
        self._updated = None
        self._args = None
        self._task_id = None
        self._error = None
        self._traceback = None
        self._fn = None
        self._result = None
        self._update(data)

    def _update(self, data):
        if data is None:
            raise ResultException('Failed to set result data for task {0}'.format(self._task_id))
        self._status = data.get('status', None)
        self._created = data.get('created', None)
        self._updated = data.get('updated', None)
        self._args = data.get('args', {})
        self._task_id = data.get('taskID', None)
        self._result = data.get('result', None)
        self._error = data.get('error', None)
        self._traceback = data.get('traceback', [])
        self._fn = data.get('fn', None)

    def _get_task(self):
        connection = self._create_connection()
        logging.getLogger(__name__).debug('CONN : {0}'.format(connection))
        logging.getLogger(__name__).debug(
            'REQ: http://{0}:{1}{2}'.format(self._conf.SERVER, self._conf.PORT, self._conf.PATH + '/result/' + self._task_id))
        try:
            headers = {'Content-type': 'application/json', 'Accept': 'application/json'}
            connection.request('GET', self._conf.PATH + '/result/' + self._task_id, None, headers)
            response = connection.getresponse()
            logging.getLogger(__name__).debug('RESP_RESULT: {0}'.format(response))
            if response and response.status == 200:
                args = json.loads(response.read().decode('utf-8'))
                logging.getLogger(__name__).debug('RESP_RESULT_E: {0}'.format(args))
                return args
            else:
                raise Exception('Failed sending task: %s' % (
                    'status %s' % response.status if response else 'unknown error'))
        except Exception as ex:
            logging.getLogger(__name__).error(ex)
        finally:
            connection.close()

    def __repr__(self):
        return 'Result[task_id: {0}, status: {1}, error: {2}, result: {3}]'.format(
            self._task_id, self._status, self._error, self._result)

    def get(self):
        """
        Wait for result calculated by KonServer and return it.
        """
        time_limit = self._conf.RESULT_WAIT_MAX_TIME
        wait = Result.INITIAL_WAIT_STEP
        total_wait = 0
        while True:
            self._update(self._get_task())
            if self._status == 2:
                break
            time.sleep(wait)
            total_wait += wait
            if total_wait > time_limit:
                break
            wait = wait * Result.WAIT_STEP_INCREASE_RATIO

        if self._status == 2:
            if self._error:
                raise Exception(self._error)
            else:
                return self._result
        raise Exception('Failed to fetch result from task {0}'.format(self._task_id))


class Control(object):
    """
    Celery's Control imitation - not implemented yet
    """

    def revoke(self, task, terminate, signal):
        pass  # TODO


class KonserverApp(APIConnection):
    """
    KonserverApp is written in a way so it can mimic behavior
    of Celery App. Only a Celery subset of features actually
    required by KonText is supported.
    """

    def __init__(self, conf=None, fn_prefix=''):
        super(KonserverApp, self).__init__(conf)
        self.Task = type('Task', (KonserverApp,), {})
        self.control = Control()
        self._registered_tasks = {}
        self._arg_mapping = {}
        self._fn_prefix = fn_prefix + '.' if fn_prefix else ''

    def task(self, bind=False, base=None, name=None):
        """
        Task is a decorator for user functions.
        """

        def decorator(fn):
            fn_name = fn.__name__ if name is None else name

            if bind:
                cls = type('KonserverApp_' + fn_name, (KonserverApp,), {})

                def tmp(task_id, *args, **kwargs):
                    obj = cls()
                    obj.request = Request(task_id=task_id)
                    return fn(obj, *args, **kwargs)
                tmp.is_bound = True
                wrapped = tmp

            elif base:
                cls = type(base.__name__ + fn_name, (base,), {})

                def tmp(_, *args, **kwargs):
                    return fn(*args, **kwargs)

                cls.__call__ = tmp
                wrapped = cls()

            else:
                @wraps(fn)
                def wrapped(*args, **kw):
                    return fn(*args, **kw)

            self._registered_tasks[self._fn_prefix + fn_name] = wrapped
            self._arg_mapping[self._fn_prefix +
                              fn_name] = partial(self._named_args_to_pos, fn, bind)
            return wrapped
        return decorator

    def _named_args_to_pos(self, fn, is_bound, args):
        """
        Konserver supports two kinds of args:
        1) positional arguments - if type(args) is not dict but it is iterable
        2) named arguments - if type(args) is dict

        In the latter case we have to transform the JSON args object to positional
        args. This function is used as a partial mapped to user function names (so
        the introspection stuff is run only once).
        """
        if type(args) is dict:
            if is_bound:
                mapping = dict((x[1], x[0]) for x in enumerate(inspect.getargspec(fn).args[1:]))
            else:
                mapping = dict((x[1], x[0]) for x in enumerate(inspect.getargspec(fn).args))
            call_args = [None] * len(mapping)
            for k, v in mapping.items():
                if k in args:
                    call_args[mapping[k]] = args[k]
            return call_args
        else:
            return [a for a in args]

    def send_task(self, name, args=None, time_limit=None, soft_time_limit=None):
        """
        TODO: support for lime_limit/soft_time_limit
        """
        connection = self._create_connection()
        logging.getLogger(__name__).debug(
            'REQ: http://{0}:{1}{2}'.format(self._conf.SERVER, self._conf.PORT, self._conf.PATH + '/task/' + name))
        try:
            headers = {'Content-type': 'application/json', 'Accept': 'application/json'}
            enc_args = json.dumps(args)
            connection.request('POST', self._conf.PATH + '/task/' + name, enc_args, headers)
            response = connection.getresponse()
            logging.getLogger(__name__).debug('RESP: {0}'.format(response))
            if response and response.status == 200:
                return Result(self._conf, json.loads(response.read().decode('utf-8')))
            else:
                raise Exception('Failed sending task: %s' % (
                    'status %s' % response.status if response else 'unknown error'))
        except Exception as ex:
            logging.getLogger(__name__).error(ex)
        finally:
            connection.close()

    def _run_task(self, name, args, task_id):
        fn = self._registered_tasks[name]
        mf = self._arg_mapping[name]
        call_args = mf(args)

        if getattr(fn, 'is_bound', False):
            ans = fn(task_id, *call_args)
        else:
            ans = fn(*call_args)
        # after_return is a special custom hook for tasks with "base" attribute (see Celery docs)
        resp = dict(taskID=task_id, status=None, error=None, result=ans)

        areturn = getattr(fn, 'after_return', None)
        if callable(areturn):
            areturn()

        return resp

    def listen(self):
        command = ''
        while True:
            command += sys.stdin.read(1)
            if command.endswith('\n'):
                task_data = None
                try:
                    task_data = json.loads(command)
                    ans = self._run_task(
                        task_data['fn'], task_data['args'], task_data['task_id'])
                    sys.stdout.write(json.dumps(ans) + '\n')
                except Exception as ex:
                    import traceback
                    err_type, err_value, err_trace = sys.exc_info()
                    tb = traceback.format_exception(err_type, err_value, err_trace)
                    task_id = task_data['task_id'] if task_data else None
                    ans = dict(taskID=task_id, error=str(ex), traceback=tb)
                    sys.stdout.write(json.dumps(ans) + '\n')
                command = ''
                sys.stdout.flush()


if __name__ == '__main__':  # here we operate in worker mode
    import imp
    import os
    worker_path = os.path.join(os.path.dirname(__file__), '..', '..', 'worker.py')
    worker = imp.load_source('worker', worker_path)
    worker.app.listen()
