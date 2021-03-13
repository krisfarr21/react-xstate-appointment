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

function promptAndAsk(prompt: string): MachineConfig<SDSContext, any, SDSEvent> {
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

    "at two": {time: "2:00"},
    "at three": {time: "3:00"},
    "at four": {time: "4:00"},
    "at five": {time: "5:00"},
    "at six": {time: "6:00"},
    "at seven": {time: "7:00"},
    "at eight": {time: "8:00"},
    "at nine": {time: "9:00"},
    "at ten": { time: "10:00" },

}

const yes_grammar: {[index: string]: boolean} = {
    "yes": true,
    "sure" : true,
    "certainly": true,
    "of course": true,
    "yes of course": true,
}

const no_grammar: {[index: string]: boolean} = {
    "no": false,
    "no way!": false,
    "absolutely not" : false
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
            }, // Change prompt and ask!
                    ...promptAndAsk("Hello, welcome! Your options are to set an appointment, to do item or to set timer.")
        },


        query: {
            invoke: {
                id: 'rasa',
                src: (context, event) => nluRequest(context.recResult),
                onDone: {
                    target: 'menu',
                    actions: [assign((context, event) => { return  {option: event.data.intent.name} }),
                    (context: SDSContext, event: any) => console.log(event.data)]

                },
                onError: {
                    target: 'welcome',
                    actions: (context, event) => console.log(event.data)
                }
            }
        },

        menu: {
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
                        value: `OK. I understand.`
                    })),
        },
     /*            nomatch: {
                    entry: say("Sorry, I don't understand"),
                    on: { ENDSPEECH: "prompt" }
        } */ 
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
        

        appointment: {
            initial: "prompt",
            on: { ENDSPEECH: "who" },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Let's create an appointment`
                    }))
                }}
        },
        who: {
            initial: "prompt",
            on: {
                RECOGNISED: [{
					cond: (context) => "person" in (grammar[context.recResult] || null),
                    actions: assign((context) => { return { person: grammar[context.recResult].person } }),
                    target: "day"

                },
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: say("Who are you meeting with?"),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
                nomatch: {
                    entry: say("Sorry I don't know them"),
                    on: { ENDSPEECH: "prompt" }
                }
            }
        },
        day: {
            initial: "prompt",
            on: {
                RECOGNISED: [{
                    cond: (context) => "day" in (grammar[context.recResult] || null),
                    actions: assign((context) => { return { day: grammar[context.recResult].day } }),
                    target: "wholeday"
                },
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `OK. ${context.person}. On which day is your meeting?`,
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
                nomatch: {
                    entry: say("Sorry I didn't understand"),
                    on: { ENDSPEECH: "prompt" }
                }
            }
        },
        wholeday: {
            initial: "prompt",
            on: {
                RECOGNISED: [{cond: (context) => (context.recResult in no_grammar),
                    target: "time"
                },
		{cond: (context) => (context.recResult in yes_grammar),
		target: "confirm_meeting_whole_day"
		},
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `OK. ${context.person} on ${context.day}. Will it take the whole day?`
                    })),
		    on: { ENDSPEECH: "ask" }
                },
		ask: {
		     entry: listen()
            },
	    nomatch: {
	    	entry: say("Sorry, I don't understand"),
		on: { ENDSPEECH: "prompt" }
	            }
                }
	},
        time: {
            initial: "prompt",
            on: {
                RECOGNISED: [{
                    cond: (context) => "time" in (grammar[context.recResult] || null),
                    actions: assign((context) => { return { time: grammar[context.recResult].time } }),
                    target: "confirm_time"

                },
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `OK. ${context.day}. What time is your meeting?`,
                    
                    })),
            on: { ENDSPEECH: "ask" }
                },
        ask: {
            entry: listen()
                },
        nomatch: {
            entry: say("Sorry I don't know that"),
        on: { ENDSPEECH: "prompt" }
                }
                }
        },
        confirm_meeting_whole_day: {
            initial: "prompt",
            on: {
                RECOGNISED: [{cond: (context) => (context.recResult in no_grammar),
                    target: "init"
                },
		{cond: (context) => (context.recResult in yes_grammar),
		target: "confirmed"
		},
                { target: ".nomatch" }]
            },

            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Do you want to create an appointment with ${context.person} on ${context.day} for the whole day?`
                    })),
		    on: { ENDSPEECH: "ask" }
                },
		ask: {
		     entry: listen()
            },
	    nomatch: {
	    	entry: say("Sorry, I don't understand"),
		on: { ENDSPEECH: "prompt" }
	           }
                }

	},
    confirm_time: {
        initial: "prompt",
        on:  {
            RECOGNISED: [{cond: (context) => (context.recResult in no_grammar),
                target: "who"
            },
    {cond: (context) => (context.recResult in yes_grammar),
    target: "confirmed"
    },
            { target: ".nomatch" }]
        },
        states: {
            prompt: {
               entry: send((context) => ({
                    type: "SPEAK",
                    value: `Do you want to create an appointment with ${context.person} on ${context.day} at ${context.time}?`
                })),
        on: { ENDSPEECH: "ask" }
            },
    ask: {
         entry: listen()
        },
    nomatch: {
        entry: say("Sorry, I don't understand"),
    on: { ENDSPEECH: "prompt" }
           }
            },
        },
    confirmed: {
        initial: "prompt",
        on: { ENDSPEECH: "init" },
        states: {
            prompt: {
                entry: send((context) => ({
                    type: "SPEAK",
                    value: `Your appointment has been created!`
                }))
            },
    }
    }
    }})


    

// RASI API!

const proxyUrl = "https://cors-anywhere.herokuapp.com/";
const rasaUrl = 'https://appointment.model.herokuapp.com/model/parse'
const nluRequest = (text: string) =>
    fetch(new Request(proxyUrl + rasaUrl, {
        method: 'POST',
        headers: { 'Origin': 'http://localhost:3000/react-xstate-appointmentt' }, // with proxy
        body: `{"text": "${text}"}`
    }))
        .then(data => data.json());
