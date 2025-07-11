
class Menu {

}

class MainMenu extends Menu {
    
}

export default class DisplayControlBar {
    bar: HTMLElement;
    menu: Menu

    constructor() {
        const bar = document.getElementById("dcb");
        if (!bar) throw new Error("DisplayControlBar: dcb element not found.");
        this.bar = bar;
        this.menu = new MainMenu();
    }

    init() {

    }
}