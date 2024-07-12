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

function getProgressbar(value){
    let progressBarHTML = "";
    progressBarHTML += `<br title="${value}">`
    progressBarHTML += `<div class="ui-progressbar ui-widget ui-widget-content ui-corner-all" title="${value}">`
    progressBarHTML += `<div class="ui-progressbar ui-widget ui-widget-content ui-corner-all" style="width:${value}"></div>`
    progressBarHTML += "</div>"
    return progressBarHTML
}