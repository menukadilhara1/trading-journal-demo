import Twemoji from "./ui/Twemoji";

const MoodCorrelation = ({ moodData = [] }) => {
  const bestMood =
    moodData.length > 0
      ? moodData.reduce((prev, curr) =>
        curr.winRate > prev.winRate ? curr : prev
      )
      : null;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {moodData.map((mood, index) => (
          <div key={index} className="flex items-center gap-5">
            <div className="w-8 flex justify-center">
              <Twemoji hex={mood.hex} size={32} />
            </div>
            <span className="">{ }</span>

            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${mood.winRate >= 60
                  ? "bg-emerald-500"
                  : mood.winRate >= 40
                    ? "bg-amber-400"
                    : "bg-rose-500"
                  }`}
                style={{ width: `${mood.winRate}%` }}
              />
            </div>

            <span className="w-12 text-sm text-right text-slate-500 dark:text-slate-400">
              {mood.winRate}%
            </span>

            <span
              className={`w-16 text-sm text-right font-medium ${mood.avgPnL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
            >
              {mood.avgPnL >= 0 ? "+" : ""}${Math.abs(mood.avgPnL)}
            </span>
          </div>
        ))}
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400 pt-2">
        {" "}
        <span className="text-slate-900 dark:text-slate-100 font-medium">
          {bestMood ? bestMood.label.replace(/\p{Extended_Pictographic}/gu, "").trim().toLowerCase() : "-"}
        </span>
        , {" "}
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
          {bestMood ? bestMood.winRate : 0}%
        </span>{" "}

      </p>
    </div>
  );
};

export default MoodCorrelation;
