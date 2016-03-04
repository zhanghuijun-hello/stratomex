/**
 * Created by Michael Kern on 02.02.2016
 */

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// libraries

import $ = require('jquery');
import d3 = require('d3');
import datatypes = require('../caleydo_core/datatype');
import C = require('../caleydo_core/main');
import matrix = require('../caleydo_core/matrix');

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// class definition

/**
 * Implementation of a simple popup to select a cluster algorithm applied to any matrix with
 * corresponding parameter settings.
 */
export class ClusterPopup
{
  private $node : d3.Selection<any> = null;
  private destroyed: boolean = false;
  public height: number = 0;

  // -------------------------------------------------------------------------------------------------------------------

  /**
   * Creates a new popup window that contains controls and buttons for all supported clustering algorithms in
   * StratomeX.
   * @param data genomic data / matrix
   * @param parent parent node
   * @param stratomex application
   * @param rowID index of row
   * @param options options for algorithms
   */
  constructor(private data: datatypes.IDataType, private parent: Element,
              private stratomex : any, rowID : number,
              private options: any)
  {
    this.options = C.mixin(
      {
        width: 580,
        rowHeight: 35,
        animationTime: 200,
        'kmeans':
        {
          inits: ['forgy', 'uniform', 'random', 'kmeans++'], // initialization method for k-means
          initSelect: 3
        },
        'hierarchical':
        {
          methods: ['single', 'complete', 'weighted', 'median', 'average', 'centroid'], // linkage method for k-means
          methodSelect: 1,
          distSelect: 0
        },
        'affinity':
        {
          rangeDamping: [0, 1, 0.5], // damping avoids oscillations of algorithm [min, max, value]
          rangeFactor: [0.1, 10, 1.0], // influences the preference value (influences number of clusters)
          prefs: ['median', 'minimum'], // median produces moderate number, minimum a small number of clusters
          prefSelect: 1,
          distSelect: 1
        },
        'fuzzy':
        {
          fuzzifier: [1.001, 100, 2.0]
        },
        'general':
        {
          distances: ['euclidean', 'sqeuclidean', 'cityblock', 'chebyshev', 'canberra', 'correlation', 'hamming',
                      'mahalanobis', 'correlation', 'pearson', 'spearman', 'kendall'],
          numClusters: [2, 10, 2]
        }
      }, options);
    this.$node = this._build(d3.select(parent), rowID);
  }

  // -------------------------------------------------------------------------------------------------------------------

  /**
   * Returns the html node.
   * @returns {d3.Selection<any>}
     */
  get node()
  {
    return this.$node;
  }

  // -------------------------------------------------------------------------------------------------------------------

  /**
   * Build the layout.
   * @param $parent
   * @param rowID
   * @returns {Selection<any>}
     * @private
     */
  private _build($parent : d3.Selection<any>, rowID : number)
  {
    var that = this;

    // find the current rows section in lineup
    var $rows = $($parent.node()).find('g.rows')[0];
    var $currentRow = $($rows).find("g.row[data-index='" + String(rowID) + "']")[0];
    var $action = $($currentRow).find("tspan[title='cluster']")[0];

    // this works for both Firefox and Chrome
    var mousePos = d3.mouse($parent.node());

    var $root = $parent.append('div').classed('clusterPopup', true);

    // start animation of popup
    $root.transition().duration(this.options.animationTime).style('opacity', 0.5);

    // create title
    var $titleBar = $root.append('div').classed('title', true);
    $titleBar.append('i').classed('fa fa-gears', true);
    $titleBar.append('text').text("Apply Clustering (" + this.data.desc.name + ')').style('margin-left', '5px');

    // create toolbar
    var $toolbar = $root.append('div').classed('toolbar', true);
    $toolbar.append('i').attr('class', 'fa fa-close')
      .on('click', (_ : any) => { that.destroy(); });

    // create body
    var $body = $root.append('div').classed('body', true);
    $body.transition().duration(this.options.animationTime).style('width', String(this.options.width) + 'px');

    // create k-means row
    this._buildKMeansRow($body);

    // create hierarchical row
    this._buildHierarchicalRow($body);

    // create affinity row
    this._buildAffinityRow($body);

    // create fuzzy row
    this._buildFuzzyRow($body);

    // compute offsets
    const offsetX = 5;
    const offsetY = 15;

    // move window to cluster button
    $root.style({
      'opacity': 0, left: String(mousePos[0] - offsetX) + 'px',
      top: String(mousePos[1] - this.height - offsetY) + 'px'
    });

    return $root;
  }

  // -------------------------------------------------------------------------------------------------------------------

  private _buildKMeansRow($body: d3.Selection<any>)
  {
    var that = this;
    this.height += this.options.rowHeight;

    var row = $body.append('div').classed('method', true);
    var button = row.append('button').text('k-Means');
    var input = row.append('input').attr({
      class: 'k-number', type: 'number',
      min: this.options.general.numClusters[0], max: this.options.general.numClusters[1],
      value: this.options.general.numClusters[2], step: 1, title: "Number of Clusters"
    });

    var select = row.append('select').attr({ title: 'Initialization Method' });
    select.selectAll('option').data(this.options.kmeans.inits)
      .enter().append('option').attr('value', (d: any) => { return d; })
      .text( (d: string) => { return d });

    select.property('value', this.options.kmeans.inits[this.options.kmeans.initSelect]);

    button.on('mouseup', (_ : any) => {
      var input = $(row.node()).find('input');
      var select = $(row.node()).find('select');
      const k = parseInt($(input).val());
      const initMethod = $(select).val();

      that.stratomex.clusterData(that.data, 'k-means', [k, initMethod]);
    });
  }

   // -------------------------------------------------------------------------------------------------------------------

  private _buildHierarchicalRow($body: d3.Selection<any>)
  {
    var that = this;
    this.height += this.options.rowHeight;

    var row = $body.append('div').classed('method', true);
    var button = row.append('button').text('Hierarchical');
    var input = row.append('input').attr({
      class: 'k-number', type: 'number',
      min: this.options.general.numClusters[0], max: this.options.general.numClusters[1],
      value: this.options.general.numClusters[2], step: 1, title: "Number of Clusters"
    });

    var select = row.append('select').attr({ title: 'Linkage Method' }).classed('linkage', true);
    select.selectAll('option').data(this.options.hierarchical.methods)
      .enter().append('option').attr('value', (d: any) => { return d; })
      .text( (d: string) => { return d });

    select.property('value', this.options.hierarchical.methods[this.options.hierarchical.methodSelect]);

    var selectDists = row.append('select').attr({ title: 'Distance Measurement' }).classed('dist', true);
    selectDists.selectAll('option').data(this.options.general.distances)
      .enter().append('option').attr('value', (d: any) => { return d; })
      .text( (d: string) => { return d });

    selectDists.property('value', this.options.general.distances[this.options.hierarchical.distSelect]);

    button.on('mouseup', (_ : any) => {
      var input = $(row.node()).find('input');
      var inputSelect = $(row.node()).find('select.linkage');
      var inputDistance = $(row.node()).find('select.dist');

      const k = parseInt($(input).val());
      const method = $(inputSelect).val();
      const dist = $(inputDistance).val();

      that.stratomex.clusterData(that.data, 'hierarchical', [k, method, dist]);
    });
  }

  // -------------------------------------------------------------------------------------------------------------------

  private _buildAffinityRow($body: d3.Selection<any>)
  {
    var that = this;
    this.height += this.options.rowHeight;

    var row = $body.append('div').classed('method', true);
    var button = row.append('button').text('Affinity');
    var inputDamping = row.append('input').attr({
      class: 'aff-number', type: 'number', name: 'damping',
      min: this.options.affinity.rangeDamping[0], max: this.options.affinity.rangeDamping[1],
      value: 0.5, step: 0.05, title: "Damping Value"
    });
    var inputFactor = row.append('input').attr({
      class: 'aff-number', type: 'number', name: 'factor',
      min: this.options.affinity.rangeFactor[0], max: this.options.affinity.rangeFactor[1],
      value: this.options.affinity.rangeFactor[2], step: 0.05, title: "Factor Value"
    });

    var select = row.append('select').attr({ title: 'Initial Preference' }).classed('init', true);
    select.selectAll('option').data(this.options.affinity.prefs)
      .enter().append('option').attr('value', (d: any) => { return d; })
      .text( (d: string) => { return d });

    select.property('value', this.options.affinity.prefs[this.options.affinity.prefSelect]);

    var selectDists = row.append('select').attr({ title: 'Distance Measurement' }).classed('dist', true);
    selectDists.selectAll('option').data(this.options.general.distances)
      .enter().append('option').attr('value', (d: any) => { return d; })
      .text( (d: string) => { return d });

    selectDists.property('value', this.options.general.distances[this.options.affinity.distSelect]);

    button.on('mouseup', (_ : any) =>
    {
      var inputDamping = $(row.node()).find("input[name='damping']");
      var inputFactor = $(row.node()).find("input[name='factor']");
      var inputSelect = $(row.node()).find("select.init");
      var inputDistance = $(row.node()).find("select.dist");

      const affDamping = parseFloat($(inputDamping).val());
      const affFactor = parseFloat($(inputFactor).val());
      const affPref = $(inputSelect).val();
      const dist = $(inputDistance).val();

      that.stratomex.clusterData(that.data, 'affinity', [affDamping, affFactor, affPref, dist]);
    });
  }

  // -------------------------------------------------------------------------------------------------------------------

  private _buildFuzzyRow($body: d3.Selection<any>)
  {
    var that = this;
    this.height += this.options.rowHeight;

    var row = $body.append('div').classed('method', true);
    var button = row.append('button').text('Fuzzy');

    var inputC = row.append('input').attr({
      class: 'c-number', type: 'number', name: 'c-number',
      min: this.options.general.numClusters[0], max: this.options.general.numClusters[1],
      value: this.options.general.numClusters[2], step: 1, title: "Number of Clusters"
    });

    var inputM = row.append('input').attr({
      class: 'fuzzifier', type: 'number', name: 'fuzzifier',
      min: this.options.fuzzy.fuzzifier[0], max: this.options.fuzzy.fuzzifier[1],
      value: this.options.fuzzy.fuzzifier[2], step: 0.001, title: "Fuzzifier Factor"
    });

    button.on('mouseup', (_ : any) => {
      var inputC = $(row.node()).find("input[name='c-number']");
      var inputM = $(row.node()).find("input[name='fuzzifier']");
      const c = parseInt($(inputC).val());
      const m = parseFloat($(inputM).val());

      that.stratomex.clusterData(that.data, 'fuzzy', [c, m]);
    });
  }

  // -------------------------------------------------------------------------------------------------------------------

  /**
   * Destroys the node and all its children.
   */
  destroy()
  {
    if (this.destroyed) { return; }

    this.$node.transition().duration(this.options.animationTime).style('opacity', 0).remove();
    this.destroyed = true;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Creation methods

/**
 *
 * @param data
 * @param parent
 * @param clusterCallBack
 * @param rowID
 * @param options
 * @returns {ClusterPopup}
 */
export function createClusterPopup(data: matrix.IMatrix, parent: Element, clusterCallBack : any, rowID : number,
              options: any)
{
  return new ClusterPopup(data, parent, clusterCallBack, rowID, options);
}
