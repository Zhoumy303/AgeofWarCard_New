// Desktop battle uses the approved 1600 × 1000 composition as a single canvas.
function fitBattleLayout() {
    if (!document.documentElement?.style?.setProperty) return;
    const scale = Math.min(window.innerWidth / 1600, window.innerHeight / 1000);
    const root = document.documentElement.style;
    root.setProperty('--battle-scale', scale);
    root.setProperty('--battle-left', `${(window.innerWidth - 1600 * scale) / 2}px`);
    root.setProperty('--battle-top', `${(window.innerHeight - 1000 * scale) / 2}px`);
}
fitBattleLayout();
window.addEventListener('resize', fitBattleLayout);

document.querySelector('.battle-menu-dropdown')?.addEventListener('click', event => {
    if (event.target.closest('button')) event.currentTarget.open = false;
});
document.getElementById('battle-tools-btn')?.addEventListener('click', () => {
    const tools = document.getElementById('debug-tools');
    if (tools) tools.open = !tools.open;
});
