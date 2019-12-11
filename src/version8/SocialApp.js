
// package imports
import React from 'react';
import Dry from 'json-dry';

// Brunel components
import SocialGraph from "./components/SocialGraph";
import InfoBox from "./components/InfoBox";
import TimeLineBox from './components/TimeLineBox';
import SlidingPanel from './components/SlidingPanel';
import ConnectionList from './components/ConnectionList';
import GroupsList from './components/GroupsList';

// Brunel model
import Social from './model/Social';
import Person from './model/Person';
import Business from './model/Business';
import Message from './model/Message';

// Data for import
import graph_data from './data.json';

// Styling for the app
import styles from './SocialApp.module.css'


class SocialApp extends React.Component {
  constructor(props){
    super(props);

    let title = "Isambard's Social Network";
    let image = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Robert_Howlett_-_Isambard_Kingdom_Brunel_and_the_launching_chains_of_the_Great_Eastern_-_Google_Art_Project.jpg/256px-Robert_Howlett_-_Isambard_Kingdom_Brunel_and_the_launching_chains_of_the_Great_Eastern_-_Google_Art_Project.jpg";
    let text = (<div><div>This is an interactive viewer of Isambard Kingdom Brunel's
                     social network. Please click in the nodes and have fun!</div>
                     <button href="#" className={styles.controlButton}
                     onClick={()=>{this.resetFilters()}}>Reset Filters</button>
                </div>);

    let social = Dry.parse(graph_data);
    console.log(social);

    if (!(social instanceof Social )){
      console.log("Could not parse!");
      social = new Social();
    }

    let group_filter = null;
    let person_filter = null;
    let anchor = "Brunel";

    this.state = {
      default_data: {"title": title, "image": image, "text": text},
      infobox_data: {"title": title, "image": image, "text": text},
      social: social,
      graph: social.getGraph({anchor:anchor, group_filter:group_filter,
                              person_filter: person_filter}),
      group_filter: group_filter,
      person_filter: person_filter,
      anchor: anchor,
      isInfoPanelOpen: false,
      isTimeLinePanelOpen: false,
      timeline: new TimeLineBox(),
    };
  }

  resetFilters(node){
    let node_filter = null;
    let group_filter = null;
    let anchor = this.state.anchor;
    let social = this.state.social;

    let graph = social.getGraph({anchor:anchor, node_filter:node_filter,
                                 group_filter:group_filter});

    this.setState({graph:graph, node_filter:node_filter,
                   group_filter:group_filter});
  }

  selectNode(node){
    let group_filter = this.state.group_filter;
    let node_filter = this.state.node_filter;
    let anchor = this.state.anchor;
    let social = this.state.social;

    if (node === node_filter){
      // switch off the current filter
      node_filter = null;
    }
    else{
      node_filter = node;
    }

    //create a new graph with this filter
    let graph = social.getGraph({anchor:anchor,
                                 group_filter:group_filter,
                                 node_filter: node_filter});

    this.setState({node_filter: node_filter, graph: graph});
  }

  selectGroup(group){
    let group_filter = this.state.group_filter;
    let node_filter = this.state.node_filter;
    let anchor = this.state.anchor;
    let social = this.state.social;

    if (group === group_filter){
      // switch off the current filter
      group_filter = null;
    }
    else{
      group_filter = group;
    }

    //create a new graph with this filter
    let graph = social.getGraph({anchor:anchor,
                                 group_filter:group_filter,
                                 node_filter: node_filter});

    this.setState({group_filter: group_filter, graph: graph});
  }

  getBiography(item){
    let name = "unknown";
    let affiliations = [];
    let positions = [];

    let social = this.state.social;
    let connections = social.getConnectionsTo(item);

    if (item.getAffiliations){
      let a = item.getAffiliations();
      for (let val in a){
        affiliations.push(a[val][0]);
      }
    }

    if (item.getPositions){
      let p = item.getPositions();
      for (let val in p){
        positions.push(p[val][0]);
      }
    }

    if (item.getName){
      name = item.getName();
    }

    return (
      <div>
        <button href="#" className={styles.peopleButton}
                onClick={()=>{this.selectNode(item);}}>
          {name}
        </button>
        <GroupsList title="Affiliations"
                    groups={affiliations}
                    emitClicked={(item)=>{this.selectGroup(item);}}/>
        <GroupsList title="Positions"
                    groups={positions}
                    emitClicked={(item)=>{this.selectGroup(item);}}/>
        <ConnectionList title="Connections"
                  connections={connections}
                  emitClicked={(item)=>{this.showInfo(item);}}/>
      </div>
    );
  }

  showInfo(item){
    console.log("showInfo");
    console.log(item);
    let newdata = {...this.state.default_data};

    if (item instanceof Person){
      newdata.title = "Person";
      newdata.text = this.getBiography(item);
      newdata.image = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Illustrirte_Zeitung_%281843%29_21_332_1_Das_vom_Stapellaufen_des_Great-Britain.PNG/640px-Illustrirte_Zeitung_%281843%29_21_332_1_Das_vom_Stapellaufen_des_Great-Britain.PNG";
    }
    else if (item instanceof Business){
      newdata.title = "Business";
      newdata.text = this.getBiography(item);
      newdata.image = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/SS_Great_Britain_diagram.jpg/320px-SS_Great_Britain_diagram.jpg";
    }
    else if (item instanceof Message){
      newdata.title = "Message";

      let sender = item.getSender();
      if (sender.getName){
        let node = sender;
        sender = <button href="#" onClick={()=>this.showInfo(node)}
                    className={styles.controlButton}>
                    {sender.getName()}
                 </button>;
      }

      let receiver = item.getReceiver();
      if (receiver.getName){
        let node = receiver;
        receiver = <button href="#" onClick={()=>this.showInfo(node)}
                     className={styles.controlButton}>
                     {receiver.getName()}
                   </button>;
      }

      newdata.text = <span>Message from {sender} to {receiver}</span>;
      newdata.image = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/SS_Great_Britain_transverse_section.jpg/320px-SS_Great_Britain_transverse_section.jpg";
    }

    this.setState({infobox_data:newdata,
                   isInfoPanelOpen:true});
  }

  slotClicked(id){
    if (!id){
      this.setState({isInfoPanelOpen:false,
                     isTimeLinePanelOpen:false});
      return;
    }

    const social = this.state.social;
    const item = social.get(id);
    this.showInfo(item);
  }

  toggleInfoPanel(){
    this.setState({isInfoPanelOpen: !(this.state.isInfoPanelOpen)});
  }

  toggleTimeLinePanel(){
    this.setState({isTimeLinePanelOpen: !(this.state.isTimeLinePanelOpen)});
  }

  render(){
    let data = this.state.infobox_data;
    let node_filter = this.state.node_filter;
    let group_filter = this.state.group_filter;

    let filter_text = null;
    let reset_button = null;

    if (node_filter){
      filter_text = `${node_filter}`;
    }

    if (group_filter){
      let text = `${group_filter}`;
      if (filter_text){
        filter_text = `${filter_text} and ${text}`;
      }
      else{
        filter_text = text;
      }
    }

    if (filter_text){
      filter_text = <div className={styles.filterText}>
                      Filtered by {filter_text}.
                    </div>;
      reset_button = <button onClick={() => {this.resetFilters()}}
                             className={styles.controlButton}>
                       Reset Filters
                     </button>;
    }

    return (
      <div>
        <SlidingPanel isOpen={this.state.isTimeLinePanelOpen}
                      position='bottom'>
          {this.state.timeline.render()}
        </SlidingPanel>
        <SlidingPanel isOpen={this.state.isInfoPanelOpen}
                      position='right'>
          <InfoBox title={data.title} text={data.text}
                   image={data.image} />
        </SlidingPanel>
        <div className={styles.graphContainer}>
          <SocialGraph graph={this.state.graph}
                       emitClicked={(id)=>this.slotClicked(id)}
                       anchor={this.state.anchor} />
        </div>
        <div className={styles.bottomContainer}>
          <button onClick={() => this.toggleTimeLinePanel()}
                  className={styles.controlButton}>
            Show timeline
          </button>
          {filter_text}
          {reset_button}
          <div className={styles.citationText}>
            See the
            source <a href="https://github.com/chryswoods/brunel">
            on GitHub</a>
          </div>
        </div>
      </div>
    );
  }
};

/*        <SlidingPanel
          isOpen={ this.state.isTimeLinePanelOpen }
          title='Timeline'
          from='bottom'
          width="100%"
          onRequestClose={() => this.setState({isTimeLinePanelOpen: false})}>
          {this.state.timeline.render()}
        </SlidingPanel>
*/

export default SocialApp;