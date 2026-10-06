import { useCallback, useEffect, useState } from 'react';

import { CAPTURE_TASK } from '@/constants/config';
import { loadCaptureTasks, saveCaptureTasks } from '@/services/captureTaskStorage';
import { cleanTask, rememberTask } from '@/utils/captureTask';

/**
 * Camera screen: the label stamped on every capture ("Column grid L4",
 * "Material delivery"). Remembered between sessions, with the last few used
 * offered as one-tap chips, so naming a shot is a tap rather than typing.
 */
export function useCaptureTaskController() {
  const [task, setTaskState] = useState<string>(CAPTURE_TASK.defaultLabel);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadCaptureTasks().then(saved => {
      if (cancelled || !saved) return;
      setTaskState(saved.task);
      setRecent(saved.recent);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setTask = useCallback(
    (input: string) => {
      const next = cleanTask(input, CAPTURE_TASK.maxChars, CAPTURE_TASK.defaultLabel);
      const nextRecent =
        next === CAPTURE_TASK.defaultLabel ? recent : rememberTask(recent, next, CAPTURE_TASK.recentCount);
      setTaskState(next);
      setRecent(nextRecent);
      saveCaptureTasks({ task: next, recent: nextRecent });
    },
    [recent]
  );

  return { task, recent, setTask };
}
