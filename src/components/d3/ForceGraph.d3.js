import PropTypes from "prop-types";
import * as d3 from "d3";

import React from "react";

import lodash from "lodash";
import {
  v4 as uuidv4
} from "uuid";

import force_spiral from "./force_spiral.js";

import styles from "../ForceGraph.module.css";

function _null_function() {}

function constrain(x, w, r = 20) {
  return Math.max(3 * r, Math.min(w - r, x));
}

/* eslint-disable react/no-direct-mutation-state */
class ForceGraphD3 extends React.Component {
  constructor(parent, props) {
    super(props);
    this.updateLink = this.updateLink.bind(this);
    this.updateNodeText = this.updateNodeText.bind(this);
    this.updateNode = this.updateNode.bind(this);
    this.draw = this.draw.bind(this);
    this.drawFromScratch = this.drawFromScratch.bind(this);
    this.update = this.update.bind(this);
    this.updateGraph = this.updateGraph.bind(this);

    this.drag = this.drag.bind(this);
    this.getWeight = this.getWeight.bind(this);
    this.parent = parent;

    // Generate a UID for this graph so that we don't clash
    // with any other graphs on the same page
    let uid = uuidv4();

    this.state = {
      width: null,
      height: null,
      social: null,
      selected: null,
      highlighted: null,
      signalClicked: _null_function,
      indirectConnectionsVisible: false,
      hideUnconnectedNodes: false,
      selectedShipID: null,
      uid: uid.slice(uid.length - 8),
    };

    this._size_changed = true;
    this._graph_changed = true;
    this._is_running = false;
    this._is_drawn = false;

    this.update(props);
  }

  getSelectedShipID() {
    return this.props.selectedShipID;
  }

  getNodeBio(id) {
    return this.state.social.getBiographies().getByID(id);
  }

  getNodeConnections(id) {
    return this.state.social.getConnections().find(id);
  }

  gotConnections(id) {
    return this.state.social.getConnections().gotConnections(id);
  }

  updateGraph(social) {
    let w = this.state.width;
    let h = this.state.height;

    this.state.social = social;

    if (!w || !h) {
      return;
    }

    let new_graph = null;

    if (social) {
      new_graph = social.getGraph();
    }

    // The social object will cache the 'getGraph' result, meaning
    // that any change in this object signals that the graph needs
    // to be redrawn
    if (new_graph !== this.state.graph) {
      //save the cached graph
      this.state.graph = new_graph;

      // This view needs to clone its own copy of the graph, as
      // D3 will update the graph object. We need to clone in case
      // two ForceGraph.d3 views are viewing the same Social graph
      new_graph = lodash.cloneDeep(this.state.graph);

      // need to update IDs so that the edges refer to the index
      // of the node in the nodes array - this could be optimised!
      for (let l in new_graph.edges) {
        let edge = new_graph.edges[l];
        for (let n in new_graph.nodes) {
          let node = new_graph.nodes[n];
          if (edge.source === node.id) {
            edge.source = n;
            edge.source_id = node.id;
          } else if (edge.target === node.id) {
            edge.target = n;
            edge.target_id = node.id;
          }
        }
      }

      // does this node already have coordinates? If not then they
      // will need to be random
      let old_graph = this._graph;

      if (!old_graph) {
        old_graph = { nodes: [] };
      }

      for (let n in new_graph.nodes) {
        let new_node = new_graph.nodes[n];
        let found = false;

        for (let m in old_graph.nodes) {
          let old_node = old_graph.nodes[m];
          if (old_node.id === new_node.id) {
            new_node.x = old_node.x;
            new_node.y = old_node.y;
            new_node.vx = old_node.vx;
            new_node.vy = old_node.vy;
            found = true;
            break;
          }
        }

        if (!found) {
          new_node.x = w * Math.random();
          new_node.y = h * Math.random();
          new_node.vx = 0.0;
          new_node.vy = 0.0;
        }
      }

      this._graph = new_graph;
      this._graph_changed = true;
    }
  }

  update(props) {
    let size_changed = false;

    if (props.indirectConnectionsVisible !== this.state.indirectConnectionsVisible) {
      this.state.indirectConnectionsVisible = props.indirectConnectionsVisible;
      this._graph_changed = true;
    }

    let hasWidth = Object.prototype.hasOwnProperty.call(props, "width");

    if (hasWidth) {
      if (this.state.width !== props.width) {
        this.state.width = props.width;
        // this.setState({ width: props.width });
        size_changed = true;
      }
    }

    let hasHeight = Object.prototype.hasOwnProperty.call(props, "height");

    if (hasHeight) {
      if (this.state.height !== props.height) {
        this.state.height = props.height;
        // this.setState({ height: props.height });
        size_changed = true;
      }
    }

    if (size_changed) {
      this._size_changed = true;
    }

    let hasSignalClicked = Object.prototype.hasOwnProperty.call(props, "signalClicked");

    if (hasSignalClicked) {
      if (this.state.signalClicked) {
        this.state.signalClicked = props.signalClicked;
      } else {
        this.state.signalClicked = _null_function;
      }
    }

    let hasSocial = Object.prototype.hasOwnProperty.call(props, "social");

    if (hasSocial) {
      this.updateGraph(props.social);
    }

    if (this.props.selectedShipID !== this.state.selectedShipID) {
      this.state.selectedShipID = this.props.selectedShipID;
      this._graph_changed = true;
    }
  }

  className() {
    return `ForceGraphD3-${this.state.uid}`;
  }

  drag() {
    let simulation = this._simulation;

    return d3
      .drag()
      .on("start", (d) => {
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (d) => {
        if (!this._is_running) simulation.restart();

        let w = this.state.width;
        let h = this.state.height;

        d.fx = constrain(d3.event.x, w, d.r);
        d.fy = constrain(d3.event.y, h, d.r);
      })
      .on("end", (d) => {
        if (!d.fixed) {
          d.fx = null;
          d.fy = null;
        }
      });
  }

  getWeight(item) {
    const shipID = this.getSelectedShipID();
    // Big weights make the size of circles too large
    const sizeScale = 0.5;

    // let weight = sizeScale * item["weight"][shipID];
    let weight = sizeScale * item["weight"][shipID];

    if (!weight) weight = 2;

    return weight;
  }

  updateNode(data) {
    let node = this._mainGroup.select(".node-group").selectAll(".node");

    node = node
      .data(data, (d) => d.id)
      .join(
        (enter) => enter.append("circle")
      )
      // Here size is the weight given to that entity
      .attr("r", (d) => {
        // If no project selected keep previous weight
        // Otherwise update using the selected project code
        return 3.0 * d.size;
      })
      .attr("class", (d) => {
        if (d.highlighted) {
          return `node ${styles.node_highlight} highlighted`
        }
        else {
          return `node ${styles.node}`
        }
      })
      .attr("id", (d) => {return d.id;})
      .on("click", (d) => { this.state.signalClicked(d.id) })
      .call(this.drag());

    return node;
  }

  updateNodeText(data) {
    let text = this._mainGroup.select(".node_text-group").selectAll(".node_text");

    // Big weights make the size of circles too large
    const sizeScale = 0.5;

    text = text
      .data(data, (d) => d.id)
      .join(
        (enter) => enter.append("text"),
      )
      .text((d) => {
        if (d.highlighted) {
          return d.label;
        }
        else {
          return "";
        }
      })
      .style("font-size", () => {
        return "1.5vh";
        // return Math.max(1.2, 2 * Math.log10(this.getWeight(d))) + "vh";
      })
      .attr("class", (d) => {
        if (d.highlighted) {
          return `node_text ${styles.node_text_highlight} highlighted`;
        }
        else {
          return `node_text ${styles.node_text}`;
        }
      })
      .attr("dx", (d) => {
        return this.getWeight(d) + "px";
      })
      .attr("dy", (d) => {
        return -1 * (3 + sizeScale * this.getWeight(d)) + "px";
      })
      .attr("text-anchor", "start")
      .attr("id", (d) => { return d.id; })
      .on("click", (d) => { this.state.signalClicked(d.id) })
      .call(this.drag());

    return text;
  }

  updateLink(data) {
    let link = this._mainGroup.select(".link-group").selectAll(".link");

    // Add prop here
    let indirectStyle = this.state.indirectConnectionsVisible ? styles.linkIndirect : styles.linkInvisible;

    const weightCutoff = 4;

    link = link
      .data(data, (d) => d.id)
      .join(
        (enter) => enter.append("path"),
      )
      .attr("class", (d) => {
        // Here we're using the weight of the edges between
        // nodes to  change the properties of the line drawn
        if (d.type === "direct") {
          if (d.value > weightCutoff) {
            return `link ${styles.link}`;
          } else {
            return `link ${styles.linkWeak}`;
          }
        } else {
          return `link ${indirectStyle}`;
        }
      })
      .attr("class", (d) => {
        if (d.highlighted) {
          return `link ${styles.link_highlight} highlighted`;
        }
        else {
          return `link ${styles.link}`;
        }
      })
      .attr("id", (d) => {
        return d.id;
      })
      .attr("source_id", (d) => {
        return d.source_id;
      })
      .attr("target_id", (d) => {
        return d.target_id;
      });

    return link;
  }

  spiralSimulation() {
    if (this._simulation) {
      this._simulation.stop();
      this._simulation = null;
      this._is_running = false;
    }

    let w = this.state.width;
    let h = this.state.height;

    let graph = this._graph;

    // We don't want a force applied to null edges
    let edges = graph.edges.filter((v) => v["type"]);

    // Node layout
    const maxWeight = d3.max(graph.nodes, (d) => {
      return d["weight"][this.props.selectedShipID];
    });

    let radiusScale = d3.scaleLinear().domain([0, maxWeight]).range([1, 80]);

    let simulation = d3
      .forceSimulation(graph.nodes)
      .alpha(1.0)
      .alphaTarget(0)
      .alphaDecay(0.01)
      .force("spiral",
        force_spiral(w, h)
        .strength(0.3)
        .index((d) => {
          return d.sort_index;
        })
      )
      .force(
        "collide",
        d3
        .forceCollide()
        .strength(0.1)
        .radius((d) => radiusScale(d["weight"][this.props.selectedShipID]))
        .iterations(30)
      )
      .force("link", d3.forceLink().strength(0).links(edges).iterations(80))
      // This function with help from https://stackoverflow.com/a/13456081
      .on("tick", () => {

        this._link.attr("d", (d) => {
          if (d.target.x === undefined || d.source.x === undefined) {
            return null;
          }

          // The smaller the curve factor the greater the curve
          const curveFactor = 2;
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.x;
          const dr = curveFactor * Math.sqrt(dx * dx + dy * dy);

          return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
        });

        this._node
          .attr("cx", (d) => {
            return (d.x = constrain(d.x, w, d.r));
          })
          .attr("cy", (d) => {
            return (d.y = constrain(d.y, h, d.r));
          });

        this._label
          .attr("x", (d) => {
            if (this.getLabelXOffset(d)) return this.getLabelXOffset(d);
          })
          .attr("y", (d) => d.y);
      })
      .on("end", () => {
        this.restartSimulation();
      });

    this._is_running = true;

    // Save the simulation so that we can update it later...
    this._simulation = simulation;
  }

  getTextWidth(text, font) {
    // https://stackoverflow.com/a/21015393
    // If given, use cached canvas for better performance
    // else, create new canvas
    let canvas = this.getTextWidth.canvas || (this.getTextWidth.canvas = document.createElement("canvas"));
    let context = canvas.getContext("2d");
    context.font = font;
    let metrics = context.measureText(text);
    return metrics.width;
  }

  getLabelXOffset(d) {
    const swapSection = 0.2 * window.innerWidth;
    const radius = this.getWeight(d);
    const textWidth = this.getTextWidth(d["label"], "Playfair Display SemiBold");

    if (d.x > window.innerWidth - swapSection) {
      const maxOffset = 0.2 * window.innerWidth;
      return d.x - Math.min(radius + 1.5 * textWidth, maxOffset);
    } else {
      return d.x;
    }
  }

  restartSimulation() {
    if (this._simulation) {
      this._simulation.restart();
      this._is_running = true;
    }
  }

  stopSimulation() {
    this._simulation.stop();
    this._is_running = false;
  }

  isRunning() {
    return this._is_running;
  }

  updateLinks(indirectConnectionsVisible) {
    if (this._graph.edges) {
      this.setState({
        indirectConnectionsVisible: indirectConnectionsVisible,
      });
      this.updateLink(this._graph.edges);
    }
  }

  drawFromScratch() {
    let graph = this._graph;

    if (!graph) {
      if (this.state.social) {
        this.updateGraph(this.state.social);
      }

      graph = this._graph;
      if (!graph) {
        console.log("Nothing to draw...");
        return;
      }
    }

    d3.select(`.${this.className()} > *`).remove();

    let container = d3.select(`.${this.className()}`);

    if (!container) {
      console.log(`Cannot find container element class ${this.className()}`);
      return;
    }

    const width = this.state.width;
    const height = this.state.height;

    if (!width || !height) {
      console.log(`Invalid width or height? ${width} x ${height}`);
      return;
    }

    let svg = container
      .append("svg")
      .attr("height", height)
      .attr("width", width)
      .attr("id", "svg-viz")
      .attr("align", "center")
      .on("click", () => {
        this.state.signalClicked(null);
      });

    let mainGroup = svg;
    this._mainGroup = mainGroup;

    this.spiralSimulation();

    mainGroup.append("g").attr("class", "link-group");
    mainGroup.append("g").attr("class", "node-group");
    mainGroup.append("g").attr("class", "node_text-group");

    this._link = this.updateLink(graph.edges);
    this._node = this.updateNode(graph.nodes);
    this._label = this.updateNodeText(graph.nodes);

    this._is_drawn = true;
  }

  draw() {
    if (!this._is_drawn) {
      this.drawFromScratch();
      this._size_changed = false;
      this._graph_changed = false;
      return;
    }

    if (this._size_changed) {
      let container = d3.select(`.${this.className()}`);
      container.selectAll("svg").attr("width", this.state.width).attr("height", this.state.height);
      this._size_changed = false;
      this._label = this.updateNodeText(this._graph.nodes);
    }

    if (this._graph_changed) {
      this.drawFromScratch();
      this._size_changed = false;
      this._graph_changed = false;
    }
  }
}

ForceGraphD3.propTypes = {
  selectedShipID: PropTypes.string,
};

export default ForceGraphD3;