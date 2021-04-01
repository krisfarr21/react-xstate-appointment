import { MachineConfig, send, Action, assign } from "xstate";
import { mapContext } from "xstate/lib/utils";
import "./styles.scss";
// import * as React from 'react';
// import * as ReactDOM from "react-dom";
// import { useMachine, asEffect } from "@xstate/react";
// import { inspect } from "@xstate/inspect";


function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

function listen(): Action<SDSContext, SDSEvent> {
    return send('LISTEN')
}

const grammar: { [index: string]: { person?: string, day?: string, time?: string } } = {
    "John": { person: "John Appleseed" },
    "Chris": {person: "Chris Swan"},
    "Mark": {person: "Mark Curtis"},
    "Sophie": {person: "Sophie Howard"},

    "on Monday": {day: "Monday"},
    "on Tuesday": {day: "Tuesday"},
    "on Wednesday": {day: "Wednesday"},
    "on Thursday": {day: "Thursday"},
    "on Friday": { day: "Friday" },

    "at 2": { time: "2:00" },
	"at 3": { time: "3:00" },
    "at 4": { time: "4:00" },
    "at 5": { time: "5:00" },
	"at 6": { time: "6:00" },
    "at 7": { time: "7:00" },
    "at 8": { time: "8:00" },
    "at 9": { time: "9:00" },
    "at 10": { time: "10:00" },
    "at 11": { time: "11:00" },
    "at 12": { time: "12:00" }

}

const grammar2: { [index: string]: boolean } = {
    "yes of course": true,
    "sure": true,
    "absolutely": true,
    "yes": true,
    "no way": false,
    "no": false
}

let count = 0;
const commands = { "stop":"S", "help":"S" };

let a = grammar2["yes"]
let b = grammar2["no"]

function promptAndAsk_der(prompt: Action<SDSContext, SDSEvent>, nomatch: string, help:string) : MachineConfig<SDSContext, any, SDSEvent> {
    return ({
        initial: 'prompt',
        states:{
            prompt: {
                entry: prompt,
                on: {ENDSPEECH: 'ask'}
            },
            ask: {
                entry: [send('LISTEN'), send('MAXSPEECH', {delay: 4000, id: 'timeout'})],
            },
            nomatch: {
                entry: say(nomatch),
                on: { ENDSPEECH: "prompt" }
            },
            help: {
                entry: say(help),
                on: { ENDSPEECH: 'ask' }
            }
        }})}

function promptAndAsk_base(prompt: string): MachineConfig<SDSContext, any, SDSEvent> {
    return ({
        initial: 'prompt',
        states: {
            prompt: {
                entry: say(prompt),
                on: { ENDSPEECH: 'ask' }
            },
            ask: {
                entry: send('LISTEN')
            },
        }})
}

export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    initial: 'init',
    states: {
        init: {
            on: {
                CLICK: 'welcome'
            }            
        },        

        welcome: {
            on: {
                RECOGNISED: {
                    target: "query",
                    actions: assign((context) => { return { option: context.recResult } }),
                }    
            },
                    ...promptAndAsk_base("Welcome! Your options are to create an appointment, a timer or a todo item.")
        },

        query: {
            invoke: {
                id: 'rasa',
                src: (context, event) => nluRequest(context.option),
                onDone: {
                    target: 'options',
                    actions: [assign((context, event) => { return  {option: event.data.intent.name} }),
                    (context: SDSContext, event: any) => console.log(event.data)]
                },
                onError: {
                    target: 'welcome',
                    actions: (context, event) => console.log(event.data)
                }
            }
        },

        options: {
            initial: "prompt",
            on: {
                ENDSPEECH: [
                    { target: 'todo', cond: (context) => context.option === 'todo' },
                    { target: 'timer', cond: (context) => context.option === 'timer' },
                    { target: 'appointment', cond: (context) => context.option === 'appointment' }
                ]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Okay!`
                    })),
                }
            }       
        },

        todo: {
            initial: "prompt",
            on: { ENDSPEECH: "init" },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Let's create a to do item`
                    }))
                }}
        },
        
        timer: {
            initial: "prompt",
            on: { ENDSPEECH: "init" },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Let's create a timer`
                    }))
                }}
        },
        
        maxspeech : {
            entry: say("Sorry I couldn't hear anything"),
            on: {'ENDSPEECH': 'mainappointment.hist'}
        },

        finalmaxspeech: {
            entry: say("It appears you are not there anymore. Goodbye."),
            on: {'ENDSPEECH': 'init'}
        },
        
        appointment: {
            initial: "prompt",
            on: { ENDSPEECH: "mainappointment" },
            states: {
                prompt: { entry: say("Let's create an appointment") }
            }
        },
        
        mainappointment: {
            initial: 'who',
            on: {
                MAXSPEECH: [
                    {cond: (context) => context.counter == 3, target: 'finalmaxspeech'},
                    {target: 'maxspeech', actions: assign((context) => { count++; return { counter: count } })}
                ]
            },

            states: {            
                hist: { type: 'history', history: 'shallow' },

                who: {
                    initial: "prompt",
                    on: {
                        RECOGNISED: [
                            { cond: (context) => "person" in (grammar[context.recResult] || {}),
                            actions: assign((context) => { return { person: grammar[context.recResult].person } }),
                            target: "day" },
                            { cond: (context) => (context.recResult in commands),
                            target: ".help" },
                            { target: ".nomatch" }
                        ]
                    },
                ...promptAndAsk_der (say ("Who are you meeting with?"), "Sorry, I don't know them", "Please tell me the person you're meeting with!")
                },    

                day: {
                    initial: "prompt",
                    on: {
                        RECOGNISED: [
                            { cond: (context) => 'day' in (grammar[context.recResult] || {}),
                            actions: assign((context) => { return { day: grammar[context.recResult].day } }),
                            target: 'wholeday'},
                            { cond: (context) => (context.recResult in commands), target: ".help" },
                            { target: ".nomatch" }                
                        ]
                    },
                    ...promptAndAsk_der (send((context) => ({ type: "SPEAK", value: `OK ${context.person}. On which day is your meeting?`})), 
                    "Sorry, could you repeat that?", "Please tell me the day of your meeting!")
                },

                wholeday: {
                    initial: "prompt",
                    on: {
                        RECOGNISED: [
                            { cond: (context) => (grammar2[context.recResult] === b), target: "time" },
                            { cond: (context) => (grammar2[context.recResult] === a), target: "whole_day_confirm" },
                            { cond: (context) => (context.recResult in commands), target: ".help" },
                            { target: ".nomatch" }               
                        ]
                    },
                    ...promptAndAsk_der (send((context) => ({ type: "SPEAK", value: `OK ${context.day}. Will your meeting take the whole day?`})), 
                    "Sorry, could you repeat that?", "Please tell me if the meeting will take whole day!")
                },

                time: {
                    initial: "prompt",
                    on: {
                        RECOGNISED: [
                            { cond: (context) => "time" in (grammar[context.recResult] || {}),
                            actions: assign((context) => { return { time: grammar[context.recResult].time } }),
                            target: "confirmtime" },
                            { cond: (context) => (context.recResult in commands), target: ".help" },
                            { target: ".nomatch" } 
                        ]
                    },
                    ...promptAndAsk_der (send((context) => ({ type: "SPEAK", value: `Okay ${context.day}. What time, please?`})), 
                    "Sorry, could you repeat that?", "Please tell me that time of your meeting!")
                },    

                whole_day_confirm: {
                    initial: "prompt",
                    on: {
                        RECOGNISED: [
                            {cond: (context) => (grammar2[context.recResult] === b), target: "who" },
                            {cond: (context) => (grammar2[context.recResult] === a), target: "final_confirm" },
                            { cond: (context) => (context.recResult in commands), target: ".help" },
                            { target: ".nomatch" } 
                        ]
                    },
                    ...promptAndAsk_der (send((context) => ({ type: "SPEAK", value: `Okay. So, appointment with ${context.person} on ${context.day} for the whole day?`})), 
                    "Sorry, could you repeat that?", "Please confirm your appointment!")
                },   

                time_confirm: {
                    initial: "prompt",
                    on:  {
                        RECOGNISED: [
                            {cond: (context) => (grammar2[context.recResult] === b), target: "who" },
                            {cond: (context) => (grammar2[context.recResult] === a), target: "final_confirm" },
                            { cond: (context) => (context.recResult in commands), target: ".help" },
                            { target: ".nomatch" }                         
                        ]
                    },
                    ...promptAndAsk_der (send((context) => ({ type: "SPEAK", value: `OK. Do you want to create an appointment with ${context.person} on ${context.day} at ${context.time}?`})), 
                    "Sorry, could you repeat that?", "I am asking if you confirm the appointment I have created so I can put it on your schedule")
                },  

                final_confirm: {
                    initial: "prompt",
                    states: {
                        prompt: {
                            entry: send((context) => ({
                                type: "SPEAK",
                                value: `Nice! Your appointment has been successfully created!` }))
                        },
                    }
                }                 
    }
    },
    }})

// RASI API!

const proxyurl = "https://cors-anywhere.herokuapp.com/";
const rasaurl = 'https://appointment-model.herokuapp.com/model/parse'
const nluRequest = (text: string) =>
    fetch(new Request(proxyurl + rasaurl, {
        method: 'POST',
        headers: { 'Origin': 'http://localhost:3000/react-xstate-appointment' }, 
        body: `{"text": "${text}"}`
    }))
        .then(data => data.json());
