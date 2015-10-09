/**
 * Created by sam on 24.02.2015.
 */

import views = require('../caleydo_core/layout_view');
import datatypes = require('../caleydo_core/datatype');
import stratification = require('../caleydo_core/stratification');
import C = require('../caleydo_core/main');
import link_m = require('../caleydo_links/link');
import ranges = require('../caleydo_core/range');
import prov = require('../caleydo_provenance/main');

import { distributeLayout } from '../caleydo_core/layout';
const layout = distributeLayout(true, 100, {top: 30, left: 30, right: 30, bottom: 10});
import columns = require('./Column');

type ColumnRef = prov.IObjectRef<columns.Column>;

class StratomeX extends views.AView {
  private _columns:ColumnRef[] = [];

  private dim:[number, number];
  private _links:link_m.LinkContainer;
  ref:prov.IObjectRef<StratomeX>;

  constructor(private parent:Element, private provGraph:prov.ProvenanceGraph) {
    super();
    this.ref = provGraph.findOrAddObject(this, 'StratomeX', 'visual');
    this._links = new link_m.LinkContainer(parent, ['changed'], {
      interactive: false,
      filter: this.areNeighborColumns.bind(this),
      mode: 'link-group',
      idTypeFilter: function (idtype, i) {
        return i === 0; //just the row i.e. first one
      }
    });
  }

  setBounds(x, y, w, h) {
    super.setBounds(x, y, w, h);
    this.dim = [w, h];
    this.relayout();
  }

  relayout() {
    var that = this;
    that._links.hide();
    var layouts = this._columns.map((c) => <any>c.value.layout);
    layout(layouts, this.dim[0], this.dim[1], null).then(function () {
      that._links.update();
    });
  }

  addDependentData(m: datatypes.IDataType) {
    const base = columns.manager.selectedObjects()[0];
    //nothing selected
    if (!base) {
      return false;
    }
    //check if idtypes match otherwise makes no sense
    if (base.data.idtypes[0] === m.idtypes[0]) {
      let mref = this.provGraph.findOrAddObject(m, m.desc.name, 'data');
      var r = ranges.list(base.range.dim(0));
      base.data.ids(r).then(m.fromIdRange.bind(m)).then((target) => {
        this.provGraph.push(columns.createColumnCmd(this.ref, mref, target));
      });
      return true;
    }
    return false;
  }

  addData(rowStrat: stratification.IStratification, m: datatypes.IDataType, colStrat?: stratification.IStratification) {
    var that = this;
    var mref = this.provGraph.findOrAddObject(m, m.desc.name, 'data');
    Promise.all<ranges.Range1D[]>([rowStrat.range(), colStrat ? colStrat.range() : ranges.Range1D.all()]).then((range_list:ranges.Range1D[]) => {
      const range = ranges.list(range_list);
      that.provGraph.push(columns.createColumnCmd(that.ref, mref, range));
    });
  }

  areNeighborColumns(ca, cb) {
    var loca = ca.location,
      locb = cb.location,
      t = null;
    if (loca.x > locb.x) { //swap order
      t = locb;
      locb = loca;
      loca = t;
    }
    //none in between
    return !this._columns.some(function (c) {
      if (c.value === ca || c.value === cb) {
        return false;
      }
      var l = c.value.location;
      return loca.x <= l.x && l.x <= locb.x;
    });
  }

  addColumn(columnRef:ColumnRef) {
    this._columns.push(columnRef);
    columnRef.value.on('changed', C.bind(this.relayout, this));
    this._links.push(false, columnRef.value);
    this.relayout();
  }

  removeColumn(columnRef:ColumnRef) {
    var i = C.indexOf(this._columns, (elem) => elem.value === columnRef.value);
    if (i >= 0) {
      this._columns.splice(i, 1);
      this._links.remove(false, columnRef.value);
      this.relayout();
    }
  }

  swapColumn(columnRefA: ColumnRef, columnRefB: ColumnRef) {
    const i = this.indexOf(columnRefA),
      j = this.indexOf(columnRefB);
    this._columns[i] = columnRefB;
    this._columns[j] = columnRefA;
    this.relayout();
  }

  indexOf(columnRef:ColumnRef) {
    return C.indexOf(this._columns, function (elem) {
      return elem.value === columnRef.value;
    });
  }

  at(index) {
    return this._columns[index];
  }

  canShift(columnRef:ColumnRef) {
    var i = C.indexOf(this._columns, function (elem) {
      return elem.value === columnRef.value;
    });
    return {
      left: i,
      right: i - this._columns.length + 1
    };
  }
}
export function create(parent:Element, provGraph:prov.ProvenanceGraph) {
  return new StratomeX(parent, provGraph);
}
