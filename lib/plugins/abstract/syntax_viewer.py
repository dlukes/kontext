# Copyright (c) 2016 Czech National Corpus
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

# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

from plugins.abstract import CorpusDependentPlugin


class SyntaxViewerPlugin(CorpusDependentPlugin):

    def search_by_token_id(self, corp, canonical_corpname, token_id):
        raise NotImplementedError()

    def is_enabled_for(self, corpname):
        raise NotImplementedError()


class SyntaxDataBackendError(Exception):
    pass


class MaximumContextExceeded(Exception):
    """
    This should be thrown by SearchBackend.get_data() in case
    a processed sentence reaches out of available Manatee context
    for a searched phrase (MAXCONTEXT, see
    https://www.sketchengine.co.uk/xdocumentation/wiki/SkE/Config/FullDoc#MAXCONTEXT
    for more details).
    """
    pass


class SearchBackend(object):

    def get_data(self, corpus, canonical_corpus_id, token_id):
        raise NotImplementedError()