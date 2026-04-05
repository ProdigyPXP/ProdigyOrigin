import contentsProdigy from "url:../../../contents/prodigy"
chrome.scripting.registerContentScripts([
  {"id":"contentsProdigy","js":[contentsProdigy.split("/").pop().split("?")[0]],"matches":["https://math.prodigygame.com/*"],"runAt":"document_start","world":"MAIN"}
]).catch(_ => {})
