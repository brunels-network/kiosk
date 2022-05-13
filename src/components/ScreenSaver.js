import React from "react";

import Timeout from "./Timeout";

import styles from "./ScreenSaver.module.css";

function ScreenSaver(props){

  let top = (3 + (60*Math.random())) + "%";
  let left = (3 + (60*Math.random())) + "%";

  return (
      <div className={styles.ui_main}
          onClick={props.emitReload}>
        <Timeout last_interaction_time={new Date()}
                    timeout={5}
                    emitReload={props.emitScreenSaver}/>
        <div className={styles.text}
             style={{top:top, left:left}}>Touch screen to start</div>
      </div>
  );
}

export default ScreenSaver;
