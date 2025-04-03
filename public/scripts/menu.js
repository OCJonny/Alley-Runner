// Menu system
class Menu {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.menuItems = [];
    this.activeMenu = null;
  }

  // Add a menu item
  addMenuItem(id, text, action) {
    this.menuItems.push({
      id,
      text,
      action
    });
  }

  // Show the menu
  show() {
    if (!this.container) return;
    
    // Clear previous menu
    this.container.innerHTML = '';
    
    // Create menu elements
    const menuElement = document.createElement('div');
    menuElement.className = 'game-menu';
    
    // Create title
    const title = document.createElement('h1');
    title.textContent = 'Game Menu';
    menuElement.appendChild(title);
    
    // Create menu items
    this.menuItems.forEach(item => {
      const button = document.createElement('button');
      button.id = item.id;
      button.textContent = item.text;
      button.addEventListener('click', item.action);
      menuElement.appendChild(button);
    });
    
    // Add to container
    this.container.appendChild(menuElement);
    this.activeMenu = menuElement;
  }

  // Hide the menu
  hide() {
    if (this.activeMenu) {
      this.activeMenu.style.display = 'none';
    }
  }
}

// Export the Menu class
export default Menu;