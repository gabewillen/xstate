import { useState, useRef, useEffect } from 'react';
import {
  interpret,
  EventObject,
  StateMachine,
  State,
  Interpreter,
  InterpreterOptions
} from 'xstate';

interface UseMachineOptions {
  immediate: boolean;
}

const defaultOptions: UseMachineOptions = {
  immediate: false
};

export function useMachine<TContext, TEvent extends EventObject>(
  machine: StateMachine<TContext, any, TEvent>,
  options: Partial<InterpreterOptions> &
    Partial<UseMachineOptions> = defaultOptions
): [
  State<TContext, TEvent>,
  Interpreter<TContext, any, TEvent>['send'],
  Interpreter<TContext, any, TEvent>
] {
  // Reference the service
  const serviceRef = useRef<Interpreter<TContext, any, TEvent> | null>(null);

  // Create the service only once
  // See https://reactjs.org/docs/hooks-faq.html#how-to-create-expensive-objects-lazily
  if (serviceRef.current === null) {
    serviceRef.current = interpret(machine, options).onTransition(state => {
      // Update the current machine state when a transition occurs
      if (state.changed) {
        setCurrent(state);
      }
    });
  }

  const service = serviceRef.current;

  // Start service immediately (before mount) if specified in options
  if (options && options.immediate) {
    service.start();
  }

  // Keep track of the current machine state
  const [current, setCurrent] = useState(service.initialState);

  useEffect(() => {
    // Start the service when the component mounts.
    // Note: the service will start only if it hasn't started already.
    service.start();

    return () => {
      // Stop the service when the component unmounts
      service.stop();
    };
  }, []);

  return [current, service.send, service];
}

export function useService<TContext, TEvent extends EventObject>(
  service: Interpreter<TContext, any, TEvent>
): [
  State<TContext, TEvent>,
  Interpreter<TContext, any, TEvent>['send'],
  Interpreter<TContext, any, TEvent>
] {
  const [current, setCurrent] = useState(service.state);

  useEffect(
    () => {
      // Set to current service state
      setCurrent(service.state);

      const listener = state => {
        if (state.changed) {
          setCurrent(state);
        }
      };

      service.onTransition(listener);

      return () => {
        service.off(listener);
      };
    },
    [service]
  );

  return [current, service.send, service];
}
