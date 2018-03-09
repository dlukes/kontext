/*
 * Copyright (c) 2018 Charles University in Prague, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2018 Tomas Machalek <tomas.machalek@gmail.com>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; version 2
 * dated June, 1991.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import RSVP from 'rsvp';
import * as Immutable from 'immutable';
import { StatelessModel } from "../../models/base";
import { ActionPayload, ActionDispatcher, typedProps } from "../../app/dispatcher";
import { IPluginApi, PluginInterfaces } from "../../types/plugins";
import { Kontext } from "../../types/common";
import {Response as TTDistResponse} from '../../models/concordance/ttDistModel';
import { MultiDict } from '../../util';


export interface KwicConnectState {
    isBusy:boolean;
    words:Immutable.List<[string, string]>;
}

export enum Actions {
    FETCH_INFO_DONE = 'KWIC_CONNECT_FETCH_INFO_DONE'
}

interface AjaxResponse extends Kontext.AjaxResponse {
    data:{
        words:Array<[string, string]>;
    };
}

enum FreqDistType {
    WORD = 'word',
    LEMMA = 'lemma'
}

export class KwicConnectModel extends StatelessModel<KwicConnectState> {

    private pluginApi:IPluginApi;

    constructor(dispatcher:ActionDispatcher, pluginApi:IPluginApi) {
        super(
            dispatcher,
            {
                isBusy: false,
                words: Immutable.List<[string, string]>()
            },
            (state, action, dispatch) => {
                switch (action.actionType) {
                    case PluginInterfaces.KwicConnect.Actions.FETCH_INFO:
                        this.fetchUniqValues(FreqDistType.WORD).then(
                            (data) => {
                                return this.fetchKwicInfo(data);
                            }

                        ).then(
                            (data) => {
                                dispatch({
                                    actionType: Actions.FETCH_INFO_DONE,
                                    props: {
                                        data: data.data
                                    }
                                });
                            },
                            (err) => {
                                dispatch({
                                    actionType: Actions.FETCH_INFO_DONE,
                                    props: {},
                                    error: err
                                });
                            }
                        );
                    break;
                }
            }
        );
        this.pluginApi = pluginApi;
    }

    private fetchKwicInfo(items:Array<string>):RSVP.Promise<AjaxResponse> {
        const args = new MultiDict();
        items.slice(0, 10).forEach(v => args.add('w', v));
        return this.pluginApi.ajax<AjaxResponse>(
            'GET',
            this.pluginApi.createActionUrl('fetch_external_kwic_info'),
            args
        );
    }

    private fetchUniqValues(fDistType:FreqDistType):RSVP.Promise<Array<string>> {
        const args = this.pluginApi.getConcArgs();
        args.set('fcrit', `${fDistType}/e 0~0>0`);
        args.set('ml', 0);
        args.set('flimit', 10);
        args.set('format', 'json');
        return this.pluginApi.ajax<TTDistResponse.FreqData>(
            'GET',
            this.pluginApi.createActionUrl('freqs'),
            args
        ).then(
            (data) => {
                return data.Blocks[0].Items.map(item => {
                    return item.Word.map(w => w.n).join(' ');
                });
            }
        );
    }

    reduce(state:KwicConnectState, action:ActionPayload):KwicConnectState {
        const newState = this.copyState(state);
        switch (action.actionType) {
            case PluginInterfaces.KwicConnect.Actions.FETCH_INFO:
                newState.isBusy = true;
            break;
            case Actions.FETCH_INFO_DONE:
                newState.isBusy = false;
                newState.words = Immutable.List<[string, string]>(typedProps<AjaxResponse>(action.props).data.words);
            break;
        }
        return newState;
    }

}