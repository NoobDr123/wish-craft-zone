interface PillSelectProps<T extends string> {
  options: readonly T[];
  value: T | undefined;
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4;
}

export function PillSelect<T extends string>({
  options,
  value,
  onChange,
  columns = 3,
}: PillSelectProps<T>) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" }[columns];
  return (
    <div className={`grid grid-cols-2 gap-3 ${cols}`}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-full border px-5 py-3 text-sm font-medium transition-all ${
              active
                ? "border-primary bg-primary text-primary-foreground shadow-soft"
                : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-peach/40"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

interface ListSelectProps<T extends string> {
  options: readonly T[];
  value: T | undefined;
  onChange: (value: T) => void;
}

export function ListSelect<T extends string>({
  options,
  value,
  onChange,
}: ListSelectProps<T>) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all ${
              active
                ? "border-primary bg-peach text-foreground shadow-soft"
                : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-peach/30"
            }`}
          >
            <span className="text-base">{opt}</span>
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                active ? "border-primary bg-primary" : "border-border"
              }`}
            >
              {active && (
                <span className="h-2 w-2 rounded-full bg-primary-foreground" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface QuestionProps {
  label: string;
  helper?: string;
  children: React.ReactNode;
}

export function Question({ label, helper, children }: QuestionProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="font-display text-xl font-semibold text-foreground">
          {label}
        </label>
        {helper && (
          <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
        )}
      </div>
      {children}
    </div>
  );
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function TextInput(props: TextInputProps) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-dashed border-peach bg-card px-5 py-4 text-base text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus:border-solid focus:border-primary focus:shadow-soft ${
        props.className ?? ""
      }`}
    />
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function TextArea(props: TextAreaProps) {
  return (
    <textarea
      {...props}
      rows={props.rows ?? 5}
      className={`w-full resize-none rounded-2xl border border-dashed border-peach bg-card px-5 py-4 text-base leading-relaxed text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus:border-solid focus:border-primary focus:shadow-soft ${
        props.className ?? ""
      }`}
    />
  );
}
