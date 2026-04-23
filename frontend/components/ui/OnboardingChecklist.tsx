'use client';

interface ChecklistProps {
  hasDataset: boolean;
  hasAnalysis: boolean;
  hasTraining: boolean;
  onGoUpload: () => void;
  onGoClean: () => void;
  onGoAnalyze: () => void;
  onGoTrain: () => void;
  onGoSimulate: () => void;
}

function Item({
  done,
  title,
  desc,
  cta,
  onClick,
}: {
  done: boolean;
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${done ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-[#FFEDC1]'}`}>
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-bold text-[#470102] truncate">{title}</p>
          <p className="text-[10px] sm:text-xs text-[#8A5A5A] mt-0.5 sm:mt-1 line-clamp-2">{desc}</p>
        </div>
        <span className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shrink-0 ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-[#FFF7EA] border border-[#FFEDC1] text-[#8A5A5A]'}`}>
          {done ? 'Done' : 'Pending'}
        </span>
      </div>
      {!done && (
        <button
          onClick={onClick}
          className="mt-2 sm:mt-3 text-[10px] sm:text-xs font-bold text-[#470102] underline decoration-[#FEB229] underline-offset-4"
        >
          {cta}
        </button>
      )}
    </div>
  );
}

export default function OnboardingChecklist(props: ChecklistProps) {
  const { hasDataset, hasAnalysis, hasTraining } = props;
  return (
    <div className="rounded-xl sm:rounded-2xl border border-[#FFEDC1] bg-[#FFF7EA] p-3 sm:p-5 shadow-sm">
      <h3 className="text-[10px] sm:text-sm font-bold uppercase tracking-[0.15em] text-[#8A5A5A] mb-3 sm:mb-4">Getting Started</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
        <Item done={hasDataset} title="Upload Data" desc="Add your CSV dataset." cta="Go to Upload" onClick={props.onGoUpload} />
        <Item done={hasDataset} title="Clean Data" desc="Fix missing/outliers." cta="Open Cleaning" onClick={props.onGoClean} />
        <Item done={hasAnalysis} title="Run EDA" desc="Generate insights." cta="Run Analysis" onClick={props.onGoAnalyze} />
        <Item done={hasTraining} title="Train Model" desc="Build models." cta="Start Training" onClick={props.onGoTrain} />
        <Item done={hasTraining} title="What-If Simulate" desc="See impact." cta="Open Simulate" onClick={props.onGoSimulate} />
      </div>
    </div>
  );
}
