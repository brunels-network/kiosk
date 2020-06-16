import Dry from "json-dry";
import lodash from "lodash";

import DateRange from "./DateRange";

import fixedNodes from "../data/fixedNodes.json";

import { ValueError } from "./Errors";

function setState(val, def = null) {
  if (val) {
    return val;
  } else {
    return def;
  }
}

function _filterWindow(values, window) {
  if (!values) {
    return values;
  }

  let ret = null;

  Object.keys(values).forEach((key) => {
    let dates = values[key];

    let intersect = window.intersect(dates);

    if (!intersect) {
      if (!ret) {
        ret = { ...values };
      }
      delete ret[key];
    }
  });

  if (ret) {
    return ret;
  } else {
    return values;
  }
}

function _filterProject(values, project) {
  if (!values) {
    return values;
  }

  let ret = null;

  Object.keys(values).forEach((key) => {
    if (!(key in project)) {
      if (!ret) {
        ret = { ...values };
      }
      delete ret[key];
    }
  });

  if (ret) {
    return ret;
  } else {
    return values;
  }
}

class Business {
  constructor(props) {
    this.state = {
      name: null,
      id: null,
      projects: {},
      sources: {},
      positions: {},
      scores: {},
      affiliations: {},
      notes: [],
      weight: {},
      edge_count: {},
    };

    this.setState(props);

    this._getHook = null;
    this._isABusinessObject = true;
  }

  static clone(item) {
    let c = new Business();
    c._getHook = item._getHook;
    c.state = lodash.cloneDeep(item.state);
    return c;
  }

  isNode() {
    return true;
  }

  inGroup(group) {
    if (group.getID) {
      let ids = {};
      ids[group.getID()] = 1;
      group = ids;
    }

    let seen = {};

    Object.keys(this.state.affiliations).forEach((key) => {
      for (let index in this.state.affiliations[key]) {
        if (this.state.affiliations[key][index] in group) {
          seen[this.state.affiliations[key][index]] = 1;
        }
      }
    });

    Object.keys(this.state.positions).forEach((key) => {
      for (let index in this.state.positions[key]) {
        if (this.state.positions[key][index] in group) {
          seen[this.state.positions[key][index]] = 1;
        }
      }
    });

    return Object.keys(seen).length === Object.keys(group).length;
  }

  getID() {
    return this.state.id;
  }

  filterSource(source) {
    if (source.getID) {
      let id = source.getID();
      source = {};
      source[id] = 1;
    }

    let nsources = Object.keys(source).length;

    let seen = {};

    Object.keys(this.state.sources).forEach((key) => {
      let s = this.state.sources[key];

      Object.keys(source).forEach((source_id) => {
        if (s.includes(source_id)) {
          seen[source_id] = 1;
        }
      });
    });

    if (Object.keys(seen).length !== nsources) {
      return null;
    } else {
      return this;
    }
  }

  filterProject(project) {
    if (project.getID) {
      let id = project.getID();
      project = {};
      project[id] = 1;
    }

    let nprojects = Object.keys(project).length;

    let seen = {};

    Object.keys(this.state.projects).forEach((key) => {
      if (key in project) {
        seen[key] = 1;
      }
    });

    if (Object.keys(seen).length !== nprojects) {
      return null;
    }

    let affiliations = _filterProject(this.state.affiliations, project);
    let positions = _filterProject(this.state.positions, project);

    if (affiliations !== this.state.affiliations || positions !== this.state.positions) {
      let business = new Business();
      business.state = { ...this.state };
      business.state.affiliations = affiliations;
      business.state.positions = positions;
      business._getHook = this._getHook;
      return business;
    } else {
      return this;
    }
  }

  filterWindow(window) {
    if (!window) {
      return this;
    } else if (!window._isADateRangeObject) {
      window = new DateRange(window);
    }

    let affiliations = _filterWindow(this.state.affiliations, window);
    let positions = _filterProject(this.state.positions, window);

    if (affiliations !== this.state.affiliations || positions !== this.state.positions) {
      let business = new Business();
      business.state = { ...this.state };
      business.state.affiliations = affiliations;
      business.state.positions = positions;
      business._getHook = this._getHook;
      return business;
    } else {
      return this;
    }
  }

  setState(state) {
    if (state) {
      this.state.name = setState(state.name);
      this.state.id = setState(state.id);
      this.state.projects = setState(state.projects, {});
      this.state.affiliations = setState(state.affiliations, {});
      this.state.positions = setState(state.positions, {});
      this.state.scores = setState(state.scores, {});
      this.state.sources = setState(state.sources, {});
      this.state.notes = setState(state.notes, []);
      this.state.weight = setState(state.weight);
      this.state.edge_count = setState(state.edge_count);

      if (!this.state.name) {
        throw new ValueError("You cannot have an Business without a name");
      }
    }
  }

  _updateHooks(hook) {
    this._getHook = hook;
  }

  merge() {
    return this;
  }

  getWeight() {
    return this.state.weight;
  }

  toString() {
    return `Business(${this.getName()})`;
  }

  getName() {
    return this.state.name;
  }

  getAffiliations() {
    return this.state.affiliations;
  }

  getPosition(projectID) {
    // Return the position for the associated projectID
    // Returns an array of position IDs
    return this.state.positions[projectID];
  }

  getPositions() {
    // Return the position for the associated projectID
    // Returns an array of position IDs
    return this.state.positions;
  }

  getSources() {
    return this.state.sources;
  }

  getScores() {
    return this.state.scores;
  }

  getEdgeCount() {
    return this.state.edge_count;
  }

  getNode(is_anchor = false) {
    let node = { id: this.getID(), label: this.getName(), title: this.getName(), shape: "circle" };

    const weight = this.getWeight();

    node["size"] = 0.5 * weight;
    node["weight"] = weight;
    node["type"] = "business";

    node["edge_count"] = this.getEdgeCount();

    // Position will be used to set the colour used
    // for the node representing this person
    node["positions"] = this.getPositions();

    let keys = Object.keys(this.state.projects);

    if (keys.length > 0) {
      node["group"] = keys.sort().join(":");
    } else {
      node["group"] = "unknown";
    }

    if (is_anchor) {
      node["shape"] = "rect";
      node["physics"] = false;
      node["group"] = "anchor";
      node["size"] = 20.0;
    }

    if (this.getName() in fixedNodes) {
      node["fixed"] = true;
    }
    return node;
  }

  toDry() {
    return { value: this.state };
  }
}

Business.unDry = function (value) {
  console.log("Creating business with value : ", value);
  return new Business(value);
};

Dry.registerClass("Business", Business);

export default Business;
