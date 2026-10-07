// Steam App IDs for games with Steam store pages.
// gameArtUrl() uses these IDs to fetch Steam header images.

const STEAM_APP_IDS: Record<string, number> = {
    // Competitive / Multiplayer
    "counter-strike 2": 730,
    "overwatch 2": 2357570,
    "apex legends": 1172470,
    "dota 2": 570,
    "pubg battlegrounds": 578080,
    "team fortress 2": 440,
    "rainbow six siege": 359550,
    "dead by daylight": 381210,
    "rust": 252490,
    "warframe": 230410,
    "destiny 2": 1085660,
    "helldivers 2": 553850,
    "marvel rivals": 2767030,
    "rocket league": 252950,
    "among us": 945360,

    // Action / Open World
    "elden ring": 1245620,
    "red dead redemption 2": 1174180,
    "red dead redemption": 2668510,
    "grand theft auto v": 271590,
    "cyberpunk 2077": 1091500,
    "the witcher 3": 292030,
    "ghost of tsushima": 2215430,
    "sekiro": 814380,
    "black myth wukong": 2358720,
    "god of war": 1593500,
    "god of war ragnarok": 2322010,
    "marvel's spider-man remastered": 1817070,
    "marvel's spider-man 2": 2651280,
    "horizon zero dawn": 1151640,
    "horizon forbidden west": 2420110,
    "days gone": 1259420,
    "assassin's creed odyssey": 812140,
    "devil may cry 5": 601150,
    "nier:automata": 524220,
    "resident evil 4": 2050650,
    "resident evil village": 1196590,
    "tomb raider": 203160,

    // RPG / Adventure
    "baldur's gate 3": 1086940,
    "hogwarts legacy": 990080,
    "monster hunter wilds": 2246340,
    "monster hunter world": 582010,
    "dark souls iii": 374320,
    "lies of p": 1627720,
    "persona 3 reload": 2161700,
    "persona 5 royal": 1687950,
    "kingdom come deliverance ii": 1771300,
    "palworld": 1623730,

    // Anime / Gacha games with Steam pages
    "honkai impact 3rd": 1671200,
    "neverness to everness": 4508340,

    // Platformers / Indie
    "hollow knight": 367520,
    "hollow knight: silksong": 1030300,
    "the henry stickmin collection": 1089980,
    "stardew valley": 413150,
    "terraria": 105600,
    "hades": 1145360,
    "hades ii": 1145350,
    "celeste": 504230,
    "undertale": 391540,
    "geometry dash": 322170,
    "vampire survivors": 1794680,
    "cuphead": 268910,
    "slay the spire": 646570,
    "little nightmares": 424840,
    "little nightmares ii": 860510,
    "ori and the blind forest": 261570,
    "ori and the will of the wisps": 1057090,
    "omori": 1150690,
    "limbus company": 1973530,
    "the binding of isaac: rebirth": 250900,

    // Survival / Sandbox
    "sons of the forest": 1326470,
    "the forest": 242760,
    "valheim": 892970,
    "ark: survival evolved": 346110,
    "subnautica": 264710,
    "project zomboid": 108600,
    "don't starve together": 322330,
    "phasmophobia": 739630,
    "lethal company": 1966720,

    // Racing / Sports
    "forza horizon 5": 1551360,
    "forza horizon 4": 1293830,
    "assetto corsa": 244210,
    "efootball": 1665460,
};

export function gameArtUrl(name: string): string | null {
    const id = STEAM_APP_IDS[name.trim().toLowerCase()];

    return id
        ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`
        : null;
}

export function getSteamGameNames(): string[] {
    return Object.keys(STEAM_APP_IDS).sort((a, b) =>
        a.localeCompare(b),
    );
}