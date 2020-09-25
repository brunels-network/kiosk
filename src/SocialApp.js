// package imports
import React from "react";
import Dry from "json-dry";

// Brunel components
import ForceGraph from "./components/ForceGraph";
import ShipSelector from "./components/ShipSelector";
import TextButton from "./components/TextButton";
import LabelButton from "./components/LabelButton";
import HowDoIOverlay from "./components/HowDoIOverlay";
import Overlay from "./components/Overlay";
import SearchBar from "./components/SearchBar";
import ToggleButton from "./components/ToggleButton";
import BioOverlay from "./components/BioOverlay";
import ShipOverlay from "./components/ShipOverlay";
import SlidingPanel from "./components/SlidingPanel";
import MainMenu from "./components/MainMenu";

import HBox from "./components/HBox";
import VBox from "./components/VBox";
import BigBox from "./components/BigBox";

// Brunel model
import Social from "./model/Social";

// Data for import
import graphData from "./socialNetwork.json";
import positionGroups from "./data/positionGroups.json";

// Styling for the app
import styles from "./SocialApp.module.css";

import { score_by_connections, score_by_influence } from "./model/ScoringFunctions";

import { size_by_connections, size_by_influence } from "./model/SizingFunctions";

class SocialApp extends React.Component {
  constructor(props) {
    super(props);

    // Load in the Dried graph data from JSON
    let social = Dry.parse(graphData);

    if (!(social instanceof Social)) {
      console.error("Could not parse!");
      social = new Social();
    }

    this.updateSize = this.updateSize.bind(this);

    this.state = {
      social: social,
      highlighted_item: null,
      selected_item: null,
      filterUnconnectedNodes: true,
      filterNCEngineers: true,
      commercialFiltered: false,
      engineersFiltered: false,
      spiralOrder: "Influence",
      nodeSize: "Influence",
      commercialNodeFilter: [],
      engineerNodeFilter: [],
      connectedNodes: null,
      selectedShip: null,
      selectedShipID: null,
      isOverlayOpen: false,
      searchText: "",
      searchIncludeBios: false,
      searchHighlightLinks: true,
      menuVisible: false,
      height: 0,
      width: 0,
    };

    const ssGW = social.getProjects().getByName("SS Great Western");
    this.state.selectedShip = ssGW.getName();
    this.state.selectedShipID = ssGW.getID();

    // make sure that we start showing only the Great Western
    this.state.social.toggleFilter(ssGW);

    this.spiralOrders = Object.freeze({
      Connections: score_by_connections,
      Influence: score_by_influence,
    });

    this.nodeSizes = Object.freeze({
      Influence: size_by_influence,
      Connections: size_by_connections,
    });

    this.state.social.setSizingFunction(size_by_influence);

    // Find the investors and engineers for easy filtering
    // This requires the
    this.findInvestorsAndEngineers();

    this.state.social.setScoringFunction(this.spiralOrders[this.state.spiralOrder]);

    this.socialGraph = null;
  }

  componentDidMount() {
    window.addEventListener("resize", this.updateSize);
    this.updateSize();
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateSize);
  }

  updateSize() {
    this.setState({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    console.log(`WINDOW ${this.state.width}x${this.state.height}`);
  }

  slotSetAnchor(item) {
    let social = this.state.social;

    if (social.setAnchor(item)) {
      this.setState({ social: social });
    }
  }

  slotReadMore(item) {
    this.setOverlay(
      <BioOverlay
        close={() => {
          this.closeOverlay();
        }}
        social={this.state.social}
        person={item}
      />
    );
  }

  slotShowShip(item) {
    this.setOverlay(
      <ShipOverlay
        close={() => {
          this.closeOverlay();
        }}
        social={this.state.social}
        ship={item}
      />
    );
  }

  slotSetShip(item) {
    if (!item._isAProjectObject) {
      console.error("Cannot set item that is not a project.");
      return;
    }

    let social = this.state.social;
    social.setFilter("project", item);

    if (this.state.searchText.length > 0) {
      social.selectSearchMatching(this.state.searchText,
        this.state.searchIncludeBios,
        this.state.searchHighlightLinks);
    }

    this.setState({ selectedShip: item.getName(), selectedShipID: item.getID() });
    this.setState({ social: social });
  }

  slotClearFilters() {
    let social = this.state.social;
    social.resetAllFilters();
    social.setFilter("project", this.state.selectedShipID)

    social.filterUnconnectedNodes(true);
    social.filterNonContributingEngineers(true);

    if (this.state.searchText.length > 0) {
      social.selectSearchMatching(this.state.searchText,
        this.state.searchIncludeBios,
        this.state.searchHighlightLinks);
    }

    this.setState({
      social: social,
      engineersFiltered: false,
      commercialFiltered: false,
      filterUnconnectedNodes: true,
      filterNCEngineers: true,
    });
  }

  toggleEngCommFilter() {
    if (this.state.engineersFiltered) {
      this.slotToggleFilterCommercial();
    }
    else if (this.state.commercialFiltered) {
      this.slotToggleFilterCommercial();
    }
    else {
      this.slotToggleFilterEngineer();
    }
  }

  slotToggleNonContributingEngineers() {
    let social = this.state.social;

    social.resetAllFilters();
    social.setFilter("project", this.state.selectedShipID)

    if (this.state.engineersFiltered) {
      social.toggleFilter(this.state.engineerNodeFilter);
    }
    else if (this.state.commercialFiltered) {
      social.toggleFilter(this.state.commercialNodeFilter);
    }

    social.filterUnconnectedNodes(this.state.filterUnconnectedNodes);
    social.filterNonContributingEngineers(!this.state.filterNCEngineers);

    if (this.state.searchText.length > 0) {
      social.selectSearchMatching(this.state.searchText,
        this.state.searchIncludeBios,
        this.state.searchHighlightLinks);
    }

    this.setState({
      social: social,
      filterNCEngineers: !this.state.filterNCEngineers
    });
  }

  slotToggleUnconnectedNodes() {
    let social = this.state.social;

    social.resetAllFilters();
    social.setFilter("project", this.state.selectedShipID)

    if (this.state.engineersFiltered) {
      social.toggleFilter(this.state.engineerNodeFilter);
    }
    else if (this.state.commercialFiltered) {
      social.toggleFilter(this.state.commercialNodeFilter);
    }

    social.filterUnconnectedNodes(!this.state.filterUnconnectedNodes);
    social.filterNonContributingEngineers(this.state.filterNCEngineers);

    if (this.state.searchText.length > 0) {
      social.selectSearchMatching(this.state.searchText,
        this.state.searchIncludeBios,
        this.state.searchHighlightLinks);
    }

    this.setState({
      social: social,
      filterUnconnectedNodes: !this.state.filterUnconnectedNodes
    });
  }

  slotToggleFilterEngineer() {
    let social = this.state.social;

    social.resetAllFilters();
    social.setFilter("project", this.state.selectedShipID)

    if (!this.state.engineersFiltered) {
      social.toggleFilter(this.state.engineerNodeFilter);
    }

    social.filterUnconnectedNodes(this.state.filterUnconnectedNodes);
    social.filterNonContributingEngineers(this.state.filterNCEngineers);

    if (this.state.searchText.length > 0) {
      social.selectSearchMatching(this.state.searchText,
        this.state.searchIncludeBios,
        this.state.searchHighlightLinks);
    }

    this.setState({
      social: social,
      engineersFiltered: !this.state.engineersFiltered,
      commercialFiltered: false});
  }

  slotToggleFilterCommercial() {
    let social = this.state.social;

    social.resetAllFilters();
    social.setFilter("project", this.state.selectedShipID)

    if (!this.state.commercialFiltered) {
      social.toggleFilter(this.state.commercialNodeFilter);
    }

    social.filterUnconnectedNodes(this.state.filterUnconnectedNodes);
    social.filterNonContributingEngineers(this.state.filterNCEngineers);

    if (this.state.searchText.length > 0) {
      social.selectSearchMatching(this.state.searchText,
        this.state.searchIncludeBios,
        this.state.searchHighlightLinks);
    }

    this.setState({
      social: social,
      commercialFiltered: !this.state.commercialFiltered,
      engineersFiltered: false});
  }

  slotClicked(id) {
    let social = this.state.social;

    if (!id) {
      social.clearSelections();
      social.clearHighlights();
      this.setState({
        social: social,
        searchText: ""
      });
    } else if (social.isSelected(id)) {
      console.log(`POP UP THE SHORT BIO FOR ${id}`);
    } else {
      let item = social.get(id)

      social.setSelected(id, true, true);
      this.setState({
        social: social,
        searchText: item.getName(),
        searchIncludeBios: false,
      });
    }
  }

  slotWindowChanged(window) {
    let social = this.state.social;

    if (social.setWindow(window)) {
      this.setState({ social: social });
    }
  }

  hasConnections(entity) {
    return this.state.social.getConnections().gotConnections(entity.id);
  }

  findInvestorsAndEngineers() {
    // Add nodes to the commercial or engineering groups. This
    // creates filters that filter positions that we've matched
    // as benig "engineer" or "commercial"
    let commercialNodeFilter = this.state.commercialNodeFilter;
    let engineerNodeFilter = this.state.engineerNodeFilter;

    const social = this.state.social;

    let positions = social.getPositions(false).items();

    Object.keys(positions).forEach((name) => {
      // Trim any extra characters or whitespace from the position string
      const namedPosition = name
        .toLowerCase()
        .replace(/\s/g, "")
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");

      // Here we need to check if they've already been saved to stop double counting
      if (positionGroups["commercial"]["members"].includes(namedPosition)) {
        const positionID = positions[name];
        if (!commercialNodeFilter.includes(positionID)) {
          commercialNodeFilter.push(positionID);
        }
      }

      if (positionGroups["engineering"]["members"].includes(namedPosition)) {
        const positionID = positions[name];
        if (!engineerNodeFilter.includes(positionID)) {
          engineerNodeFilter.push(positionID);
        }
      }
    });
  }

  toggleSpiralOrder() {
    const order = this.state.spiralOrder;

    if (order === "Influence") {
      this.setSpiralOrder("Connections");
    } else if (order === "Connections") {
      this.setSpiralOrder("Influence");
    }
  }

  setSpiralOrder(order) {
    if (order in this.spiralOrders) {
      if (this.state.spiralOrder !== order) {
        let social = this.state.social;
        social.setScoringFunction(this.spiralOrders[order]);
        this.setState({
          social: social,
          spiralOrder: order,
        });
      }
    } else {
      console.error("Invalid spiral order, valid orders are ", Object.keys(this.spiralOrders));
    }
  }

  toggleNodeSize() {
    const size = this.state.nodeSize;

    if (size === "Influence") {
      this.setNodeSize("Connections");
    } else if (size === "Connections") {
      this.setNodeSize("Influence");
    }
  }

  setNodeSize(size) {
    if (size in this.nodeSizes) {
      if (this.state.nodeSize !== size) {
        let social = this.state.social;
        social.setSizingFunction(this.nodeSizes[size]);
        this.setState({
          social: social,
          nodeSize: size,
        });
      }
    } else {
      console.error("Invalid sizing function, valid functions are ", Object.keys(this.nodeSizes));
    }
  }

  setOverlay(item) {
    this.setState({
      overlayItem: item,
      isOverlayOpen: true,
    });
  }

  closeOverlay() {
    this.setState({
      isOverlayOpen: false,
      overlayItem: null,
    });
  }

  performSearch(text, include_bios, highlight_links) {
    let social = this.state.social;

    social.selectSearchMatching(text, include_bios, highlight_links);

    this.setState({
      social: social,
      searchIncludeBios: include_bios,
      searchHighlightLinks: highlight_links,
      searchText: text,
    });
  }

  slotShowMenu() {
    this.setState({ menuVisible: true });
  }

  slotCloseMenu() {
    this.setState({ menuVisible: false });
  }

  slotUpdateSearch(text) {
    this.performSearch(text, this.state.searchIncludeBios, this.state.searchHighlightLinks);
  }

  slotSearchBiosToggled(toggled) {
    this.performSearch(this.state.searchText, toggled, this.state.searchHighlightLinks);
  }

  slotSearchHighlightToggled(toggled) {
    this.performSearch(this.state.searchText, this.state.searchIncludeBios, toggled);
  }

  toggleOverlay() {
    this.setState({ isOverlayOpen: !this.state.isOverlayOpen });
  }

  resetAll() {
    window.location.reload(true);
  }

  render() {
    let menu = <TextButton onClick={() => { this.slotShowMenu() }}>Menu</TextButton>;

    let search = (
      <SearchBar
        emitUpdate={(text) => {
          this.slotUpdateSearch(text);
        }}
        searchText={this.state.searchText}
      />
    );

    let help = (
      <TextButton
        onClick={() => {
          this.setOverlay(
            <HowDoIOverlay
              close={() => {
                this.closeOverlay();
              }}
            />
          );
        }}
      >
        Help
      </TextButton>
    );

    let graph = (
      <ForceGraph
        social={this.state.social}
        selected={this.state.selected_item}
        highlighted={this.state.highlighted_item}
        signalClicked={(id) => this.slotClicked(id)}
        emitSetCenter={(id) => {
          this.slotSetAnchor(id);
        }}
        emitReadMore={(id) => {
          this.slotReadMore(id);
        }}
      />
    );

    let spiral_button = (
      <LabelButton
        label="Spiral Order"
        button={this.state.spiralOrder}
        onClick={() => {
          this.toggleSpiralOrder();
        }}
      />
    );

    let ship_button = (
      <ShipSelector
        projects={this.state.social.getProjects()}
        emitSetShip={(item) => this.slotSetShip(item)}
        emitShowShip={(item) => this.slotShowShip(item)}
      />
    );

    let size_button = (
      <LabelButton
        label="Node Size"
        button={this.state.nodeSize}
        onClick={() => {
          this.toggleNodeSize();
        }}
      />
    );

    let filter_text = "None";

    if (this.state.commercialFiltered) {
      filter_text = "Commercial";
    }
    else if (this.state.engineersFiltered) {
      filter_text = "Engineers";
    }

    let filter_button = (
      <LabelButton
        label="Filter"
        button={filter_text}
        onClick={() => {
          this.toggleEngCommFilter();
        }}
      />
    );

    let unconnected_button = (
      <LabelButton
        label="Unconnected"
        button={this.state.filterUnconnectedNodes ? "Invisible" : "Visible"}
        onClick={() => {
          this.slotToggleUnconnectedNodes();
        }}
      />
    )

    let noncontrib_button = (
      <LabelButton
        label="Non-contributers"
        button={this.state.filterNCEngineers ? "Invisible" : "Visible"}
        onClick={() => {
          this.slotToggleNonContributingEngineers();
        }}
      />
    );

    let search_button = (
      <LabelButton
        label="Search"
        button={this.state.searchIncludeBios ? "Biographies" : "Names"}
        onClick={() => {
          this.slotSearchBiosToggled(!this.state.searchIncludeBios)
        }}
      />
    )

    let overlay = null;
    if (this.state.isOverlayOpen) {
      overlay = (
        <Overlay
          toggleOverlay={() => {
            this.toggleOverlay();
          }}
        >
          {this.state.overlayItem}
        </Overlay>
      );
    }

    let drawer = null;

    let left_side = null;
    let right_side = null;

    if (this.state.width > 1024 || this.state.width === 812) { // iphone X landscape
      left_side = (
        <HBox>
          { spiral_button}
          { filter_button}
          { search_button}
        </HBox>);

      right_side = (
        <HBox>
          {unconnected_button}
          {noncontrib_button}
          {size_button}
        </HBox>
      );
    }
    else if (this.state.width > 768) {
      left_side = (
        <HBox>
          { spiral_button}
          { filter_button}
        </HBox>);

      right_side = (
        <HBox>
          {noncontrib_button}
          {size_button}
        </HBox>
      );

      drawer = (
        <VBox>
          <HBox>
            <BigBox/>
            {spiral_button}
            {size_button}
            <BigBox/>
          </HBox>
          <HBox>
            <BigBox/>
            {search_button}
            {unconnected_button}
            <BigBox/>
          </HBox>
          <HBox>
            <BigBox/>
            {filter_button}
            {noncontrib_button}
            <BigBox/>
          </HBox>
        </VBox>
      );
    }
    else if (this.state.width > 550) {
      left_side = spiral_button
      right_side = size_button

      drawer = (
        <VBox>
          <HBox>
            <BigBox />
            {spiral_button}
            {size_button}
            <BigBox />
          </HBox>
          <HBox>
            <BigBox />
            {search_button}
            {unconnected_button}
            <BigBox />
          </HBox>
          <HBox>
            <BigBox />
            {filter_button}
            {noncontrib_button}
            <BigBox />
          </HBox>
        </VBox>);
    }
    else {
      drawer = (
        <VBox>
          <HBox>
            <BigBox/>
            {spiral_button}
            {size_button}
            <BigBox/>
          </HBox>
          <HBox>
            <BigBox/>
            {search_button}
            {unconnected_button}
            <BigBox/>
          </HBox>
          <HBox>
            <BigBox/>
            {filter_button}
            {noncontrib_button}
            <BigBox/>
          </HBox>
        </VBox>
      );
    }

    let drawer_button = null;

    if (drawer !== null) {
      drawer_button = (
        <button
          className={styles.drawerButton}
          onClick={()=>{this.setState({drawerVisible: !this.state.drawerVisible})}}>
          ⤊ Options ⤊
        </button>);
      drawer = (
        <SlidingPanel
          isOpen={this.state.drawerVisible}
          position="bottom"
          width="100%"
          height="14em"
        >
          <VBox>
            <button
              className={styles.drawerButton}
              onClick={() => { this.setState({ drawerVisible: !this.state.drawerVisible }) }}>
              ⟱ Close ⟱
            </button>
            <BigBox>
              {drawer}
            </BigBox>
          </VBox>
        </SlidingPanel>
      );
    }

    let mainmenu = (
      <SlidingPanel
        isOpen={this.state.menuVisible}
        position="left"
        height="24em"
        width="18em"
      >
        <MainMenu
          close={() => { this.slotCloseMenu() }}
          unconnectedNodesVisible={!this.state.filterUnconnectedNodes}
          ncEngineersVisible={!this.state.filterNCEngineers}
          engineersFiltered={this.state.engineersFiltered}
          commercialFiltered={this.state.commercialFiltered}
          searchHighlight={this.state.searchHighlightLinks}
          searchBios={this.state.searchIncludeBios}
          emitResetFilters={() => { this.slotClearFilters() }}
          emitToggleFilterCommercial={() => this.slotToggleFilterCommercial()}
          emitToggleFilterEngineering={() => this.slotToggleFilterEngineer()}
          emitToggleUnconnectedNodesVisible={() => this.slotToggleUnconnectedNodes()}
          emitToggleNCEngineersVisible={() => this.slotToggleNonContributingEngineers()}
          emitSearchHighlightToggled={
            () => this.slotSearchHighlightToggled(!this.state.searchHighlightLinks)
          }
          emitSearchBiosToggled={
            () => this.slotSearchBiosToggled(!this.state.searchIncludeBios)
          }
        />
      </SlidingPanel>
    );

    return (
      <div>
        {mainmenu}
        <div className={styles.ui_main}>
          <VBox>
            <HBox>
              {menu}
              <BigBox>{search}</BigBox>
              {help}
            </HBox>

            <BigBox>
              <div className={styles.fullscreen}>{graph}</div>
            </BigBox>

            <HBox>
              {left_side}
              <BigBox>{ship_button}</BigBox>
              {right_side}
            </HBox>
            {drawer_button}
          </VBox>
        </div>
        {drawer}
        {overlay}
      </div>
    );
  }
}


export default SocialApp;
