import * as React from 'react';

type GoalSummaryInput = {
  target: number;
  current: number;
};

export function useGoalsSummary(goals: GoalSummaryInput[]) {
  return React.useMemo(() => {
    const totalGoals = goals.length;
    const targetTotal = goals.reduce((acc, goal) => acc + goal.target, 0);
    const accumulatedTotal = goals.reduce((acc, goal) => acc + goal.current, 0);

    return {
      totalGoals,
      targetTotal,
      accumulatedTotal,
    };
  }, [goals]);
}

