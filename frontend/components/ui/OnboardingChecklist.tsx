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
    <div className={`rounded-xl border p-4 ${done ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-[#FFEDC1]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#470102]">{title}</p>
          <p className="text-xs text-[#8A5A5A] mt-1">{desc}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-[#FFF7EA] border border-[#FFEDC1] text-[#8A5A5A]'}`}>
          {done ? 'Done' : 'Pending'}
        </span>
      </div>
      {!done && (
        <button
          onClick={onClick}
          className="mt-3 text-xs font-bold text-[#470102] underline decoration-[#FEB229] underline-offset-4"
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
    <div className="rounded-2xl border border-[#FFEDC1] bg-[#FFF7EA] p-5 shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#8A5A5A] mb-4">Getting Started</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
        <Item done={hasDataset} title="Upload Data" desc="Add your CSV dataset." cta="Go to Upload" onClick={props.onGoUpload} />
        <Item done={hasDataset} title="Clean Data" desc="Fix missing values/outliers." cta="Open Cleaning" onClick={props.onGoClean} />
        <Item done={hasAnalysis} title="Run EDA" desc="Generate insights/charts." cta="Run Analysis" onClick={props.onGoAnalyze} />
        <Item done={hasTraining} title="Train Model" desc="Build and compare models." cta="Start Training" onClick={props.onGoTrain} />
        <Item done={hasTraining} title="What-If Simulate" desc="Adjust features and see impact." cta="Open Simulation" onClick={props.onGoSimulate} />
      </div>
    </div>
  );
}
