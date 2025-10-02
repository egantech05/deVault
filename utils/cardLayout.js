export const getCardSize = (width) => {
    const gutter = 0;
    const pad = 0;
    const avail = width - pad;

    let perRow = 1;
    if (avail >= 100) perRow = 3;
    if (avail >= 200) perRow = 3;
    if (avail >= 600) perRow = 4;
    if (avail >= 800) perRow = 6;
    if (avail >= 1000) perRow = 8;

    const totalGutters = gutter * (perRow + 1);
    const size = (avail - totalGutters) / perRow;
    return Math.max(size, 120);
};
