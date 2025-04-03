/**
 * Menu class for handling menu items and interactions
 */
class Menu {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.items = [];
  }
  
  /**
   * Add a menu item
   * @param {string} id - ID for the menu item
   * @param {string} text - Display text
   * @param {Function} action - Click handler function
   */
  addMenuItem(id, text, action) {
    const item = document.createElement('div');
    item.id = id;
    item.className = 'menu-item';
    item.textContent = text;
    item.addEventListener('click', action);
    
    if (this.container) {
      this.container.appendChild(item);
      this.items.push(item);
    }
  }
  
  /**
   * Show the menu
   */
  show() {
    if (this.container) {
      this.container.style.display = 'flex';
    }
  }
  
  /**
   * Hide the menu
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
}

// Export for use in other modules
export { Menu };