/*
 * Copyright (c) 2017 Charles University in Prague, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2017 Tomas Machalek <tomas.machalek@gmail.com>
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

/// <reference path="../../../ts/declarations/react.d.ts" />

import React from 'vendor/react';
import {calcTextColorFromBg, importColor, color2str} from '../../util';


export function init(dispatcher, mixins, layoutViews, ctFreqDataRowsStore, ctFlatFreqDataRowsStore) {

    /**
     *
     */
    const QuantitySelect = (props) => {

        const handleSelectChange = (evt) => {
            props.changeQuantity(evt.target.value);
        };

        return (
            <label>
                {mixins.translate('freq__ct_quantity_label')}:{'\u00a0'}
                <select value={props.currValue} onChange={handleSelectChange}>
                    <option value="ipm">i.p.m.</option>
                    <option value="abs">absolute freq.</option>
                </select>
            </label>
        );
    };

    /**
     *
     */
    const MinFreqInput = (props) => {

        const handleInputChange = (evt) => {
            dispatcher.dispatch({
                actionType: 'FREQ_CT_SET_MIN_ABS_FREQ',
                props: {value: evt.target.value}
            });
        };

        return (
            <label>
                {mixins.translate('freq__ct_min_freq_label')}:{'\u00a0'}
                <input type="text" style={{width: '3em'}} value={props.currVal}
                        onChange={handleInputChange} />
            </label>
        );
    };

    /**
     *
     */
    const EmptyVectorVisibilitySwitch = (props) => {

        const handleCheckboxChange = (evt) => {
            dispatcher.dispatch({
                actionType: 'FREQ_CT_SET_EMPTY_VEC_VISIBILITY',
                props: {value: evt.target.checked}
            });
        };

        return (
            <label>
                {mixins.translate('freq__ct_hide_zero_vectors')}:{'\u00a0'}
                <input type="checkbox" onChange={handleCheckboxChange}
                        checked={props.hideEmptyVectors} />
            </label>
        );
    };

    /**
     *
     */
    const TransposeTableCheckbox = (props) => {
        const handleClickTranspose = (evt) => {
            dispatcher.dispatch({
                actionType: 'FREQ_CT_TRANSPOSE_TABLE',
                props: {}
            });
        };

        return (
            <label>
                {mixins.translate('freq__ct_transpose_table')}:{'\u00a0'}
                <input type="checkbox" checked={props.isChecked} onChange={handleClickTranspose} />
            </label>
        );
    };

    /**
     *
     */
    const CTTableModForm = (props) => {

        return (
            <form>
                <fieldset>
                    <legend>{mixins.translate('freq__ct_parameters_legend')}</legend>
                    <ul className="items">
                        <li>
                            <QuantitySelect currVal={props.viewQuantity} changeQuantity={props.changeQuantity} />
                        </li>
                        <li>
                            <MinFreqInput currVal={props.minAbsFreq} />
                        </li>
                        <li>
                            <EmptyVectorVisibilitySwitch hideEmptyVectors={props.hideEmptyVectors} />
                        </li>
                        <li>
                            <TransposeTableCheckbox isChecked={props.transposeIsChecked} />
                        </li>
                    </ul>
                </fieldset>
            </form>
        );
    };

    /**
     *
     */
    const CTCellMenu = (props) => {

        const handlePosClick = (evt) => {
            dispatcher.dispatch({
                actionType: 'FREQ_CT_QUICK_FILTER_CONCORDANCE',
                props: {
                    args: props.data.pfilter
                }
            });
        };

        const handleCloseClick = () => {
            props.onClose();
        };

        return (
            <layoutViews.PopupBox onCloseClick={handleCloseClick} customClass="menu">
                <fieldset className="detail">
                    <legend>{mixins.translate('freq__ct_detail_legend')}</legend>
                    {mixins.translate('freq__ct_ipm_freq_label')}:
                    {'\u00a0'}{mixins.formatNumber(props.data.ipm, 1)}
                    <br />
                    {mixins.translate('freq__ct_abs_freq_label')}:
                    {'\u00a0'}{mixins.formatNumber(props.data.abs, 0)}
                </fieldset>
                <form>
                    <fieldset>
                        <legend>{mixins.translate('freq__ct_pfilter_legend')}</legend>
                        <table>
                            <tbody>
                                <tr>
                                    <th>
                                        {props.attr1} =
                                    </th>
                                    <td>
                                        <input type="text" readOnly value={props.label1} />
                                    </td>
                                </tr>
                                <tr>
                                    <th>
                                        {props.attr2} =
                                    </th>
                                    <td>
                                        <input type="text" readOnly value={props.label2} />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <p>
                            <button type="button" className="default-button"
                                    onClick={handlePosClick}>
                                {mixins.translate('freq__ct_pfilter_btn_label')}
                            </button>
                        </p>
                    </fieldset>
                </form>
            </layoutViews.PopupBox>
        );
    };

    /**
     *
     */
    const CTCell = (props) => {

        const getValue = () => {
            if (isNonEmpty()) {
                switch (props.quantity) {
                    case 'ipm':
                        return mixins.formatNumber(props.data.ipm, 1);
                    case 'abs':
                        return mixins.formatNumber(props.data.abs, 0);
                    default:
                        return NaN;
                }

            } else {
                return '';
            }
        };

        const isNonEmpty = () => {
            const v = (() => {
                switch (props.quantity) {
                    case 'ipm':
                        return props.data ? props.data.ipm : 0;
                    case 'abs':
                        return props.data ? props.data.abs : 0;
                    default:
                        return NaN;
                }
            })();
            return v > 0;
        };

        const handleItemClick = () => {
            props.onClick();
        };

        if (isNonEmpty()) {
            const bgStyle = {};
            const linkStyle = {color: color2str(calcTextColorFromBg(importColor(props.data.bgColor, 1)))}
            const tdClasses = ['data-cell'];
            if (props.isHighlighted) {
                tdClasses.push('highlighted');

            } else {
                bgStyle['backgroundColor'] = props.data.bgColor;
            }
            return (
                <td className={tdClasses.join(' ')} style={bgStyle}>
                    <a onClick={handleItemClick} style={linkStyle}
                            title={mixins.translate('freq__ct_click_for_details')}>
                        {getValue()}
                    </a>
                    {props.isHighlighted ? <CTCellMenu onClose={props.onClose}
                                                        data={props.data}
                                                        attr1={props.attr1}
                                                        label1={props.label1}
                                                        attr2={props.attr2}
                                                        label2={props.label2} /> : null}
                </td>
            );

        } else {
            return <td className="empty-cell" />;
        }
    };

    /**
     *
     */
    const THRowColLabels = (props) => {

        const handleClick = () => {
            dispatcher.dispatch({
                actionType: 'MAIN_MENU_SHOW_FREQ_FORM',
                props: {}
            });
        };

        return (
            <th className="attr-label">
                <a onClick={handleClick} title={mixins.translate('freq__ct_change_attrs')}>
                    {props.attr1} {'\u005C'} {props.attr2}
                </a>
            </th>
        );
    };

    /**
     *
     */
    class CT2dFreqResultView extends React.Component {

        constructor(props) {
            super(props);
            this.state = this._fetchState();
            this._changeQuantity = this._changeQuantity.bind(this);
            this._handleStoreChange = this._handleStoreChange.bind(this);
            this._highlightItem = this._highlightItem.bind(this);
            this._resetHighlight = this._resetHighlight.bind(this);
        }

        _fetchState() {
            return {
                d1Labels: ctFreqDataRowsStore.getD1Labels(),
                d2Labels: ctFreqDataRowsStore.getD2Labels(),
                data: ctFreqDataRowsStore.getData(),
                attr1: ctFreqDataRowsStore.getAttr1(),
                attr2: ctFreqDataRowsStore.getAttr2(),
                adHocSubcWarning: ctFreqDataRowsStore.getQueryContainsWithin(),
                minAbsFreq: ctFreqDataRowsStore.getMinAbsFreq(),
                viewQuantity: 'ipm',
                highlightedCoord: null,
                transposeIsChecked: ctFreqDataRowsStore.getIsTransposed(),
                hideEmptyVectors: ctFreqDataRowsStore.getFilterZeroVectors()
            };
        }

        _changeQuantity(q) {
            const state = this._fetchState();
            state.viewQuantity = q;
            this.setState(state);
        }

        _handleStoreChange() {
            const newState = this._fetchState();
            newState.viewQuantity = this.state.viewQuantity;
            newState.highlightedCoord = this.state.highlightedCoord;
            this.setState(newState);
        }

        componentDidMount() {
            ctFreqDataRowsStore.addChangeListener(this._handleStoreChange);
        }

        componentWillUnmount() {
            ctFreqDataRowsStore.removeChangeListener(this._handleStoreChange);
        }

        _renderWarning() {
            if (this.state.adHocSpfilterVisibleubcWarning) {
                return (
                    <p className="warning">
                        <img src={mixins.createStaticUrl('img/warning-icon.svg')}
                                alt={mixins.translate('global__warning')} />
                        {mixins.translate('freq__ct_uses_ad_hoc_subcorpus_warn')}
                    </p>
                );
            }
        }

        _labels1() {
            return this.state.d1Labels.filter(x => x[1]).map(x => x[0]);
        }

        _labels2() {
            return this.state.d2Labels.filter(x => x[1]).map(x => x[0]);
        }

        _resetHighlight() {
            const newState = this._fetchState();
            newState.viewQuantity = this.state.viewQuantity;
            newState.highlightedCoord = null;
            this.setState(newState);
        }

        _highlightItem(i, j) {
            this._resetHighlight();
            const newState = this._fetchState();
            newState.viewQuantity = this.state.viewQuantity;
            newState.highlightedCoord = [i, j];
            this.setState(newState);
        }

        _isHighlighted(i, j) {
            return this.state.highlightedCoord !== null &&
                    this.state.highlightedCoord[0] === i &&
                    this.state.highlightedCoord[1] === j;
        }

        _isHighlightedRow(i) {
            return this.state.highlightedCoord !== null && this.state.highlightedCoord[0] === i;
        }

        _isHighlightedCol(j) {
            return this.state.highlightedCoord !== null && this.state.highlightedCoord[1] === j;
        }

        render() {
            return (
                <div className="CT2dFreqResultView">
                    {this._renderWarning()}
                    <div className="toolbar">
                        <CTTableModForm
                                minAbsFreq={this.state.minAbsFreq}
                                viewQuantity={this.state.viewQuantity}
                                changeQuantity={this._changeQuantity}
                                hideEmptyVectors={this.state.hideEmptyVectors}
                                transposeIsChecked={this.state.transposeIsChecked} />
                    </div>
                    <table className="ct-data">
                        <tbody>
                            <tr>
                                <THRowColLabels attr1={this.state.attr1} attr2={this.state.attr2} />
                                {this._labels2().map((label2, i) =>
                                    <th key={`lab-${i}`} className={this._is}
                                        className={this._isHighlightedCol(i) ? 'highlighted' : null}>{label2}</th>)}
                            </tr>
                            {this._labels1().map((label1, i) => {
                                const htmlClass = ['vert'];
                                if (this._isHighlightedRow(i)) {
                                    htmlClass.push('highlighted');
                                }
                                return (
                                    <tr key={`row-${i}`}>
                                        <th className={htmlClass.join(' ')}><span>{label1}</span></th>
                                        {this._labels2().map((label2, j) => {
                                            return <CTCell data={this.state.data[label1][label2]} key={`c-${i}:${j}`}
                                                            quantity={this.state.viewQuantity}
                                                            onClick={()=>this._highlightItem(i, j)}
                                                            onClose={this._resetHighlight}
                                                            attr1={this.state.attr1}
                                                            label1={label1}
                                                            attr2={this.state.attr2}
                                                            label2={label2}
                                                            isHighlighted={this._isHighlighted(i, j)} />;
                                        })}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            );
        }
    }

    /**
     *
     * @param {*} props
     */
    const TRFlatListRow = (props) => {
        return (
            <tr>
                <td className="num">{props.idx}.</td>
                <td>{props.data.val1}</td>
                <td>{props.data.val2}</td>
                <td className="num">{props.data.abs}</td>
                <td className="num">{props.data.ipm}</td>
            </tr>
        );
    }

    /**
     *
     * @param {*} props
     */
    const THSortableCol = (props) => {

        const handleClick = () => {
            dispatcher.dispatch({
                actionType: 'FREQ_CT_SORT_FLAT_LIST',
                props: {
                    value: props.value,
                    reversed: props.isActive ? !props.isReversed : false
                }
            });
        };

        const renderFlag = () => {
            if (props.isActive) {
                if (props.isReversed) {
                    return <img src={mixins.createStaticUrl('img/sort_desc.svg')} />;

                } else {
                    return <img src={mixins.createStaticUrl('img/sort_asc.svg')} />;
                }
            }
            return null;
        };

        return (
            <th className="sort-col">
                <a onClick={handleClick} title={mixins.translate('global__sort_by_this_col')}>
                    {props.label}
                    {renderFlag()}
                </a>
            </th>
        );
    }

    /**
     *
     */
    class CTFlatFreqResultView extends React.Component {

        constructor(props) {
            super(props);
            this.state = this._fetchStoreState();
            this._handleStoreChange = this._handleStoreChange.bind(this);
        }

        _fetchStoreState() {
            return {
                data: ctFlatFreqDataRowsStore.getData(),
                attr1: ctFlatFreqDataRowsStore.getAttr1(),
                attr2: ctFlatFreqDataRowsStore.getAttr2(),
                minAbsFreq: ctFlatFreqDataRowsStore.getMinAbsFreq(),
                sortCol: ctFlatFreqDataRowsStore.getSortCol(),
                sortColIsReversed: ctFlatFreqDataRowsStore.getSortColIsReversed()
            };
        }

        _handleStoreChange() {
            this.setState(this._fetchStoreState());
        }

        componentDidMount() {
            ctFlatFreqDataRowsStore.addChangeListener(this._handleStoreChange);
        }

        componentWillUnmount() {
            ctFlatFreqDataRowsStore.removeChangeListener(this._handleStoreChange);
        }

        render() {
            return (
                <div className="CTFlatFreqResultView">
                    <div className="toolbar">
                        <form>
                            <fieldset>
                                <legend>{mixins.translate('freq__ct_parameters_legend')}</legend>
                                <ul className="items">
                                    <li>
                                        <MinFreqInput currVal={this.state.minAbsFreq} />
                                    </li>
                                </ul>
                            </fieldset>
                        </form>
                    </div>
                    <table className="data">
                        <tbody>
                            <tr>
                                <th />
                                <THSortableCol label={this.state.attr1} value={this.state.attr1}
                                        isActive={this.state.sortCol === this.state.attr1}
                                        isReversed={this.state.sortCol === this.state.attr1 && this.state.sortColIsReversed}
                                         />
                                <th>{this.state.attr2}</th>
                                <THSortableCol label={mixins.translate('freq__ct_abs_freq_label')}
                                        value="abs" isActive={this.state.sortCol === 'abs'}
                                        isReversed={this.state.sortCol === 'abs' && this.state.sortColIsReversed}
                                        />
                                <THSortableCol label={mixins.translate('freq__ct_ipm_freq_label')}
                                        value="ipm" isActive={this.state.sortCol === 'ipm'}
                                        isReversed={this.state.sortCol === 'ipm' && this.state.sortColIsReversed} />
                            </tr>
                            {this.state.data.map((item, i) =>
                                <TRFlatListRow key={`r_${i}`} idx={i+1} data={item} />)}
                        </tbody>
                    </table>
                </div>
            );
        }
    }

    /**
     *
     */
    class CTFreqResultView extends React.Component {

        constructor(props) {
            super(props);
            this.state = {mode: 'table'};
            this._handleModeSwitch = this._handleModeSwitch.bind(this);
        }

        _handleModeSwitch(evt) {
            this.setState({mode: evt.target.value});
        }

        _renderContents() {
            switch (this.state.mode) {
                case 'table':
                    return <CT2dFreqResultView {...this.props} />
                case 'list':
                    return <CTFlatFreqResultView {...this.props} />
                default:
                    return null;
            }
        }

        render() {
            return (
                <div className="CTFreqResultView">
                    <p className="mode-switch">
                        <label>
                            {mixins.translate('freq__ct_view_mode')}:{'\u00a0'}
                            <select onChange={this._handleModeSwitch}>
                                <option value="table">{mixins.translate('freq__ct_switch_table_view')}</option>
                                <option value="list">{mixins.translate('freq__ct_switch_list_view')}</option>
                            </select>
                        </label>
                    </p>
                    {this._renderContents()}
                </div>
            );
        }
    }

    return {
        CTFreqResultView: CTFreqResultView
    };

}