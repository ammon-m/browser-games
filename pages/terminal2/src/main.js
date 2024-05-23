import { CommandParser } from "./lib/CommandParser.js"
import Logger from "./lib/Logger.js"
import ThemeColorSet from "./lib/ThemeColorSet.js"
import * as minifs from "./lib/minifs.js"

'use strict';

function stringReplaceShift(string, index, replacement) {
    if(index < string.length)
        return string.substring(0, index) + replacement + string.substring(index, string.length - replacement.length);
    else
        return string + replacement
}

const font = "14px monospace"

const output = {
    value: ""
}

let input = ""
let cursorPos = 0

let pastingAll = false;

globalThis.global = {
    user: "user",
    device: "terminal2",
    cwd: "~"
}

const theme = ThemeColorSet.Default

export const fs = new minifs.FileSystem()

/**@type {HTMLElement} */
let mainElement = null

/**@type {HTMLCanvasElement} */
let textCanvas = null
/**@type {CanvasRenderingContext2D} */
let textCtx = null

/**@type {HTMLCanvasElement} */
let cursorCanvas = null
/**@type {CanvasRenderingContext2D} */
let cursorCtx = null

let charWidth = 10
let lineHeight = 15

let maxColumns = 1
let maxRows = 1

/**
 * @param {string} motd
 */
function init(motd)
{
    if(motd) console.log(motd)

    mainElement = document.getElementById("main")

    textCanvas = document.getElementById("text")
    textCtx = textCanvas.getContext("2d")
    textCanvas.width = mainElement.clientWidth;
    textCanvas.height = mainElement.clientHeight;

    cursorCanvas = document.getElementById("selection")
    cursorCtx = cursorCanvas.getContext("2d")
    cursorCanvas.width = mainElement.clientWidth;
    cursorCanvas.height = mainElement.clientHeight;

    textCtx.font = font;
    cursorCtx.font = font;

    charWidth = textCtx.measureText("0").width + textCtx.letterSpacing;
    lineHeight = 15

    maxColumns = Math.floor(textCanvas.width / charWidth)
    maxRows = Math.floor(textCanvas.height / charWidth)

    drawCanvas()

    window.addEventListener("keydown", event => {
        if(event.code == "Enter")
        {
            cursorPos = 0
            receiveUserCommand(input)
            event.preventDefault()
        }
        else if(event.code == "Backspace")
        {
            input = input.slice(0, cursorPos - 1) + input.slice(cursorPos)
            cursorPos--
            event.preventDefault()

            drawCanvas()
        }
        else if(event.code == "ArrowUp" && commandHistory.length > 0 && !event.shiftKey)
        {
            if(--commandHistoryPos < 0) commandHistoryPos = 0
            input = commandHistory[commandHistoryPos]
            cursorPos = input.length
            event.preventDefault()

            drawCanvas()
        }
        else if(event.code == "ArrowDown" && commandHistory.length > 0 && !event.shiftKey)
        {
            if(++commandHistoryPos > commandHistory.length) commandHistoryPos = commandHistory.length
            if(commandHistoryPos == commandHistory.length)
                input = ""
            else
                input = commandHistory[commandHistoryPos]
            cursorPos = input.length
            event.preventDefault()

            drawCanvas()
        }
        else if(event.code == "ArrowLeft" && cursorPos > 0 && !event.shiftKey)
        {
            if(event.ctrlKey) cursorPos = 0
            else cursorPos--

            drawCanvas()
        }
        else if(event.code == "ArrowRight" && cursorPos < input.length && !event.shiftKey)
        {
            if(event.ctrlKey) cursorPos = input.length
            else cursorPos++

            drawCanvas()
        }
        else if(event.key.match(/[\w,\.\{\}\[\]\|=\-_!~\^\*@\"'`#\$%&\/\\ ]/) && event.key.length == 1 && !event.ctrlKey && !event.metaKey)
        {
            input = stringReplaceShift(input, cursorPos, event.key)
            cursorPos++;
            commandHistoryPos = commandHistory.length
            event.preventDefault()

            drawCanvas()
        }
        else if(event.code == "KeyV" && event.ctrlKey && event.shiftKey)
        {
            pastingAll = true;
        }
    })

    window.addEventListener("paste", event => {
        let str = event.clipboardData.getData("text/plain");

        if(!pastingAll)
        {
            str = str.replaceAll(/[^\w,\.\{\}\[\]\|=\-_!~\^\*@\"'`#\$%&\/\\ ]/g, "")
        }

        input = stringReplaceShift(input, cursorPos, str)
        cursorPos += str.length
        commandHistoryPos = commandHistory.length

        pastingAll = false;
        event.preventDefault();

        drawCanvas()
    }, false)
}

/**
 * @param {string} value
 */
function receiveUserCommand(value)
{
    if(!value || value == "") return;

    commandHistory.push(value)
    commandHistoryPos = commandHistory.length
    logger.log("> " + value)

    console.log(value)

    input = ""

    const parser = new CommandParser()
    let command = null

    try
    {
        command = parser.parse(value)
    }
    catch(error)
    {
        logger.error(error)
        return;
    }
    if(command == null) return;

    command.execute()

    drawCanvas()
}

/**@type {string[]}*/
const commandHistory = []
let commandHistoryPos = 0

const logger = new Logger((entries) => {
    renderOutput(entries)
})

globalThis.logger = logger;

function renderOutput(entries)
{
    if(!entries) { output.value = ""; return; }

    let str = ""
    for(var i = 0; i < entries.length; i++)
    {
        const ln = entries[i]

        let type = ""
        if(ln.type == "Warning") type = " warn"
        if(ln.type == "Error") type = " error"

        let shift = ""
        if(ln.message.startsWith("> ")) shift = ` style="margin-left: -2ch;"`

        let txt = ln.message

        str += `<span class="line${type}"${shift}>${txt}</span>`
    }
    output.value = str

    drawCanvas()
}

function drawCanvas()
{
    textCtx.fillStyle = theme.background;
    textCtx.fillRect(0, 0, textCanvas.width, textCanvas.height);

    textCtx.fillStyle = "#ffffff";
    textCtx.font = font;

    // let str = global.user + "@" + global.device + ":" + global.cwd + "$ "
    let x = 5
    let y = 5

    textCtx.fillStyle = "#ffffff";
    textCtx.fillText(global.user + "@" + global.device, x * charWidth, y * lineHeight);
    x += (global.user + "@" + global.device).length

    textCtx.fillStyle = "#ffffff";
    textCtx.fillText(":", x * charWidth, y * lineHeight);
    x++

    textCtx.fillStyle = "#ffffff";
    textCtx.fillText(global.cwd, x * charWidth, y * lineHeight);
    x += global.cwd.length

    textCtx.fillStyle = "#ffffff";
    textCtx.fillText("$ ", x * charWidth, y * lineHeight);
    x += 2

    textCtx.fillStyle = "#ffffff";
    textCtx.fillText(input, x * charWidth, y * lineHeight);



    // cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height)
    // cursorCtx.font = font;

    // cursorCtx.fillStyle = theme.foreground
    // cursorCtx.fillRect(cursorPos * charWidth, y * lineHeight, charWidth, lineHeight)

    // cursorCtx.fillStyle = theme.background
    // cursorCtx.fillText(input[cursorPos] ? input[cursorPos] : " ", cursorPos * charWidth, y * lineHeight)
}

init("hello world")