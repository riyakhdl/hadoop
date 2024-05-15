function accordionJS(parent, selector){
  window.addEventListener("DOMContentLoaded", () => {
    window.removeEventListener("DOMContentLoaded", arguments.callee, false);
    if (parent.charAt(0) === "#"){
      parent = parent.substring(1);
    }
    let accordion = new Accordion(parent, {
      openTab: 1,
      oneOpen: true,
    }, selector);
  })
}

function getProgressbar(value) {
  let progressBarHTML = "";
  progressBarHTML += `<br title="${value}">`
  progressBarHTML += `<div class="ui-progressbar ui-widget ui-widget-content ui-corner-all" title="${value}">`
  progressBarHTML += `<div class="ui-progressbar ui-widget ui-widget-content ui-corner-all" style="width:${value}"></div>`
  progressBarHTML += "</div>"
  return progressBarHTML
}

function getTableHeadings(id) {
  let headings = [];
  window.addEventListener('DOMContentLoaded', () => {
    window.removeEventListener('DOMContentLoaded', arguments.callee, false);
    headings = [].slice.call(document.getElementById(id).tHead.rows[0].cells);
    return headings.map((x) => { return x.innerText });
  });
}


function DataTableHelper(dtSelector, opts, headings) {
  // Initialize DataTable with new sorting functions
  yarnDt(DataTable.prototype);
  opts["headings"] = headings;
  dtElem = null;
  document.addEventListener('DOMContentLoaded', () => {
    window.removeEventListener('DOMContentLoaded', arguments.callee, false);
    dtElem = document.querySelector(dtSelector);
    dtElem.classList.add("dataTable");
    dtElem.classList.add("no-footer");
    dtElem.setAttribute('aria-describedby', 'apps_info')
    dtElem.style.width = `${window.screen.width} px`;
    return new DataTable(dtElem, opts);
  });
}
