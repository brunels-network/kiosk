import React, { Component } from "react";
import { CSSTransition } from "react-transition-group";
import styles from "./StyledApp.module.css";
import fadeTransition from "./transitions/fade.module.css";
import slideTransition from './transitions/slide.module.css';

class Menu extends Component {
  state = {
    isOpen: false
  };

  toggleDropdown = () => {
    this.setState(state => ({ isOpen: !state.isOpen }));
  };

  render() {
    const { isOpen } = this.state;

    return (
      <div className={styles.container}>
        <button
          type="button"
          className={styles.button}
          onClick={this.toggleDropdown}
        >
          &#9776;
        </button>

        <CSSTransition
          in={isOpen}
          timeout={200}
          classNames={slideTransition}
          unmountOnExit
        >
          {state => (
            <div className={styles.dropdown}>
              <ul className={styles.list}>
                <li>Option 1</li>
                <li>Option 2</li>
                <li>Option 3</li>
                <li>Option 4</li>
              </ul>
            </div>
          )}
        </CSSTransition>
      </div>
    );
  }
}

export default Menu;
