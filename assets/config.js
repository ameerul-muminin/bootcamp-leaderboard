// Where the board reads its data.
//
// Paste the "Publish to web" CSV links of the two tabs in the Google Sheet
// (File > Share > Publish to web > pick the tab > Comma-separated values).
// Leave a link empty to use the copy in /data instead.
window.BOARD_CONFIG = {
  teamsCsv: "",
  scoresCsv: "",

  // How often the board re-reads the sheet. Live mode (?live) uses liveRefreshSeconds.
  refreshSeconds: 60,
  liveRefreshSeconds: 20,
};
