import PropTypes from "prop-types";
import React from "react";

import imageFilenames from "../data/entityImageFilenames.json";

import TextButton from "./TextButton";

import styles from "./BioOverlay.module.css";

class BioOverlay extends React.Component {
  constructor(props) {
    super(props);

    this.state = { isVisible: false };
  }

  render() {
    // const sources = this.props.sources;
    const person = this.props.person;
    const id = person.getID();
    const name = person.getName();
    const biographies = this.props.social.getBiographies();

    // Get biography and strip name
    let bio = biographies.getByID(id);
    bio = bio.replace(name + ". ", "");

    const filename = imageFilenames[id]["filename"];

    let sourceButton = (
      <TextButton
        textColor="black"
        hoverColor="#808080"
        fontSize="1.8vh"
        padding="0px 4px 4px 4px"
        onClick={this.props.toggleSourceOverlay}
      >
        {this.props.sourceButtonText}
      </TextButton>
    );

    // const filename = "The_Steamer_Great_Western_of_Bristol_RMG_A7626.jpg";

    return (
      <div className={styles.container}>
        <div className={styles.closeButton}>
          <button onClick={this.props.toggleOverlay} style={{ background: "none", border: "none", fontSize: "2vh" }}>
            x
          </button>
        </div>
        <div className={styles.nameHeader}>{person.getName()}</div>
        <div className={styles.positions}>{}</div>
        <div className={styles.bio}>{bio}</div>
        <div className={styles.sources}>
          <div className={styles.dynamicHeader}>
            Sources
            <br />
            <br />
            <br />
          </div>
          <div>{sourceButton}</div>
        </div>
        <div className={styles.divider} />
        <div className={styles.imageSection}>
          <div>
            <img key={id} src={require(`../images/${filename}`)} alt="Manuscript" />
          </div>
          <div className={styles.imageDescription}>Image description</div>
        </div>
      </div>
    );
  }
}

BioOverlay.propTypes = {
  social: PropTypes.object.isRequired,
  toggleOverlay: PropTypes.func.isRequired,
  person: PropTypes.object.isRequired,
  toggleSourceOverlay: PropTypes.func.isRequired,
  sourceButtonText: PropTypes.string.isRequired,
};

export default BioOverlay;
