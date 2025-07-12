// This is bad. I had a 1 day deadline.
import { JSX, ReactNode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import IslandToAirportMap from "../data/IslandToAirportMap.json";
import AssetManager from '../AssetManager';

let assetManager: AssetManager;

type ButtonProps = {
    disabled?: boolean,
    pressed?: boolean,
    onClick?: () => any,
    children?: ReactNode;
};

function Button({ disabled=false, pressed=false, onClick, children }: ButtonProps) {
    let classname = "dcb-button";
    if (disabled) classname += " dcb-disabled";
    if (pressed) classname += " dcb-pressed";
    return <div className={classname} onClick={onClick}>{children}</div>
}


enum Menus {
    MainMenu,
    AptSelectMenu,
}

// cursed
let setMenuId: React.Dispatch<React.SetStateAction<Menus>>;
let selectedAirport = "";

function getSelectedAirport() {
    return selectedAirport;
}

function AptSelectMenu() {
    const [island, setIsland] = useState("");
    const [airport, setAirportState] = useState("");

    function setAirport(airportName: string) {
        setAirportState(airportName);
        selectedAirport = airportName;
    }

    const islandToAirportMap = new Map(Object.entries(IslandToAirportMap));
    
    if (island === "")
        return <>
            <Button onClick={() => setMenuId(Menus.MainMenu)}>BACK</Button>
            <Button onClick={() => setIsland("RKFRD")}>RKFRD</Button>
            <Button onClick={() => setIsland("CYPRS")}>CYPRS</Button>
            <Button onClick={() => setIsland("IZOLI")}>IZOLI</Button>
            <Button onClick={() => setIsland("ORNJI")}>ORNJI</Button>
            <Button onClick={() => setIsland("PERTH")}>PERTH</Button>
            <Button onClick={() => setIsland("BARTH")}>BARTH</Button>
            <Button onClick={() => setIsland("SKPLS")}>SKPLS</Button>
            <Button onClick={() => setIsland("GRIND")}>GRIND</Button>
            <Button onClick={() => setIsland("SAUTH")}>SAUTH</Button>
        </>;
    else
        return <>
            <Button onClick={() => setIsland("")}>BACK</Button>
            {islandToAirportMap.get(island)?.map(apt =>
                <Button
                    pressed={selectedAirport === apt}
                    onClick={() => {
                        airport !== apt ? setAirport(apt) : setAirport("");
                        setMenuId(Menus.MainMenu);
                    }}
                    key={apt}
                >{apt}</Button>
            )}
        </>;
}

function AssetButton({ assetString, pressed = false }: { assetString: string, pressed?: boolean } ) {
    let assetInfo
    try {
        assetInfo = assetManager.parseAssetString(assetString);
    } catch (e) {
        return <Button disabled>{assetString}</Button>
    }

    const [loaded, setLoadedState] = useState(pressed || assetManager.isAssetLoaded(assetString));

    function setLoaded() {
        setLoadedState(assetManager.isAssetLoaded(assetString));
    }

    return <Button pressed={loaded} onClick={async () => {
        if (loaded)
            assetManager.unloadAsset(assetString);
        else
            await assetManager.loadAsset(assetString);
        setLoaded();
    }}>{assetInfo.name}</Button>

}

function MapsSection() {
    const airport = getSelectedAirport();
    const maps: Array<JSX.Element> = [];

    maps.push(<AssetButton pressed assetString='global/coast' />)
    maps.push(<AssetButton pressed assetString='global/boundaries' />)

    const category = assetManager.getCategory(airport);
    if (category) {
        for (const asset of category.assets) {
            if (maps.length >= 6) break;
            maps.push(<AssetButton assetString={`${airport}/${asset.id}`} />)
        }
    }

    function getMap(i: number) {
        return maps[i] || <Button disabled />
    }

    const quickMaps2 = <>
        <div>{getMap(0)}{getMap(1)}</div>
        <div>{getMap(2)}{getMap(3)}</div>
        <div>{getMap(4)}{getMap(5)}</div>
    </>

    return <>
        <Button disabled>MAPS</Button>

        {quickMaps2}
    </>
}

function MainMenu() {
    return (<>
        <Button onClick={() => setMenuId(Menus.AptSelectMenu)}>APT SELECT</Button>
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
        <MapsSection />
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



function ActiveMenu() {
    const [menuId, setMenuIdLocal] = useState(Menus.MainMenu);

    // cursed (thank you closures)
    setMenuId = setMenuIdLocal;

    if (menuId === Menus.MainMenu)
        return <MainMenu />
    if (menuId === Menus.AptSelectMenu)
        return <AptSelectMenu />
}

export default class DisplayControlBar {
    constructor(localAssetManager: AssetManager) {
        assetManager = localAssetManager;
        const bar = document.getElementById("dcb");
        if (!bar) throw new Error("DisplayControlBar: dcb element not found.");
        const root = createRoot(bar);
        root.render(<ActiveMenu />);
    }
}