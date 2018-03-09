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
import * as React from 'react';
import { ActionDispatcher } from '../../app/dispatcher';
import { Kontext } from '../../types/common';
import { KwicConnectModel, KwicConnectState } from './model';
import { Component } from 'react';
import { layout } from 'vendor/d3';
import {PluginInterfaces} from '../../types/plugins';

export interface KwicConnectWidgetProps {

}


export interface View {
    KwicConnectWidget:React.ComponentClass<KwicConnectWidgetProps>;
}

export function init(dispatcher:ActionDispatcher, he:Kontext.ComponentHelpers, model:KwicConnectModel):View {

    const layoutViews = he.getLayoutViews();

    class KwicConnectWidget extends React.Component<KwicConnectWidgetProps, KwicConnectState> {

        constructor(props) {
            super(props);
            this.state = model.getState();
            this.stateChangeHandler = this.stateChangeHandler.bind(this);
        }

        stateChangeHandler(state:KwicConnectState) {
            this.setState(state);
        }

        componentDidMount() {
            model.addChangeListener(this.stateChangeHandler);
            dispatcher.dispatch({
                actionType: PluginInterfaces.KwicConnect.Actions.FETCH_INFO,
                props: {}
            });
        }

        componentWillUnmount() {
            model.removeChangeListener(this.stateChangeHandler);
        }

        renderWidget() {
            return (
                <div className="KwicConnectWidget">
                    <table className="word-table">
                        <tbody>
                        {this.state.words.map(([w1, w2], i) =>
                            <tr key={`w${i}`}>
                                <th>{w1}</th><td>{w2}</td>
                            </tr>)
                        }
                        </tbody>
                    </table>
                </div>
            );
        }

        render() {
            return (
                <div>
                    {this.state.isBusy ? <layoutViews.AjaxLoaderImage /> : this.renderWidget()}
                </div>
            );
        }
    }

    return {
        KwicConnectWidget: KwicConnectWidget
    };
}