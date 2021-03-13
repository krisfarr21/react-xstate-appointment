import { MachineConfig, send, Action } from "xstate";

// SRGS parser and example (logs the results to console on page load)
import { loadGrammar } from './runparser'
import { parse } from './chartparser'
import { grammar } from './grammars/pizzaGrammar'

const gram = loadGrammar(grammar)
const input = "I would like a coca cola and three large pizzas with pepperoni and mushrooms"
const prs = parse(input.split(/\s+/), gram)
const result = prs.resultsForRule(gram.$root)[0]

console.log(result)

const sayColour: Action<SDSContext, SDSEvent> = send((context: SDSContext) => ({
    type: "SPEAK", value: `Repainting to ${context.recResult}`
}))

function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

function promptAndAsk(prompt: string): MachineConfig<SDSContext, any, SDSEvent> {
    return ({
        initial: 'prompt',
        states: {
            prompt: {
                // action which happens on entry and on exit!
                entry: say(prompt),
                on: { ENDSPEECH: 'ask' }
            },
            ask: {
                // on entry, 'ask' sends a listen event to recognizer
                entry: send('LISTEN'),
            },
        }
    })
}


export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    // default state when entering the machine... (initial: x_state --> used to initialize default states)
    initial: 'init',
    states: {
        init: {
            on: {
                CLICK: 'welcome'
            }
        },
        welcome: {
            on: {
                RECOGNISED: [
                    // if stop is recognized, it moves to stop.
                    { target: 'stop', cond: (context) => context.recResult === 'stop' },
                    // else, moves to repaint
                    { target: 'repaint' }]
            },
            ...promptAndAsk("Tell me the colour")
        },
        stop: {
            entry: say("Ok"),
            always: 'init'
        },
        repaint: {
            // default state: prompt
            initial: 'prompt',
            states: {
                prompt: {
                    // entry, sayColour event is sent!
                    entry: sayColour,
                    // 
                    on: { ENDSPEECH: 'repaint' }
                },
                repaint: {
                    // event 'ChangeColour' is activated... foun in 
                    entry: 'changeColour',
                    // root --> name of the machine, dm: dmmachine, welcome --> state
                    always: '#root.dm.welcome'
                }
            }
        }
    }
})
