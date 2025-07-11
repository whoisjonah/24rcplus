import { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

type ButtonProps = {
    disabled?: boolean,
    onClick?: () => any,
    children: ReactNode;
};

function Button({ disabled=false, onClick, children }: ButtonProps) {
    let classname = "dcb-button";
    if (disabled) classname += " dcb-disabled";
    return <div className={classname} onClick={onClick}>{children}</div>
}

function MainMenu() {
    return (<>
        <Button onClick={() => console.log("test")}>APT SELECT</Button>
        <Button disabled>RANGE<br />50</Button>
        <div>
            <Button disabled>PLACE CNTR</Button>
            <Button disabled>OFF CNTR</Button>
        </div>
        <Button disabled>RR<br />5</Button>
        <div>
            <Button disabled>PLACE RR</Button>
            <Button disabled>RR CNTR</Button>
        </div>
        <Button disabled>MAPS</Button>

        <div>
            <Button disabled>MAP 1</Button>
            <Button disabled>MAP 2</Button>
        </div>
        <div>
            <Button disabled>MAP 3</Button>
            <Button disabled>MAP 4</Button>
        </div>
        <div>
            <Button disabled>MAP 5</Button>
            <Button disabled>MAP 6</Button>
        </div>
        <Button disabled>BRITE</Button>
        <div>
            <Button disabled>LDR DIR<br />N</Button>
            <Button disabled>LDR<br />2</Button>
        </div>
        <Button disabled>CHAR SIZE</Button>
        <Button disabled>PREF</Button>
        <div>
            <Button disabled>SSA FILTER</Button>
            <Button disabled>GI TEXT FILTER</Button>
        </div>
        <Button disabled>SHIFT</Button>
    </>)
}

export default class DisplayControlBar {
    constructor() {
        const bar = document.getElementById("dcb");
        if (!bar) throw new Error("DisplayControlBar: dcb element not found.");
        const root = createRoot(bar);
        root.render(<MainMenu />);
    }
}