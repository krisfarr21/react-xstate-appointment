/// <reference types="react-scripts" />

declare module 'react-speech-kit';

interface SDSContext {
    // option(option: any): import("xstate").StateMachine<any, any, any, { value: any; context: any; }> | import("xstate").Subscribable<any> | import("xstate").InvokeCallback | PromiseLike<any>;
    recResult: string;
    nluData: any;
    ttsAgenda: string;
    person: string;
    day: string;
    time: string;
    query: string;
    option: string;
}

type SDSEvent =
    | { type: 'CLICK' }
    | { type: 'RECOGNISED' }
    | { type: 'ASRRESULT', value: string }
    | { type: 'ENDSPEECH' }
    | { type: 'LISTEN' }
    | { type: 'SPEAK', value: string };
