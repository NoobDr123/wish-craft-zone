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

// Common email domains for autocomplete suggestions.
const EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "me.com",
  "live.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
];

interface EmailInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "list"> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Smart email field:
 * - `type="email"` + `autoComplete="email"` + `inputMode="email"` triggers the
 *   device keyboard's email suggestions (iOS / Android pull from saved Apple ID
 *   / Google account emails — that's the only "device email" we can offer).
 * - A <datalist> suggests common domain completions as the user types past `@`.
 */
export function EmailInput({ value, onChange, ...rest }: EmailInputProps) {
  const listId = "email-domain-suggestions";
  const atIdx = value.indexOf("@");
  const local = atIdx >= 0 ? value.slice(0, atIdx) : value;
  const showSuggestions = atIdx >= 0 && local.length > 0;

  const handleSuggestionClick = (domain: string) => {
    const synthetic = {
      target: { value: `${local}@${domain}` },
      currentTarget: { value: `${local}@${domain}` },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onChange(synthetic);
  };

  return (
    <div className="space-y-2">
      <input
        {...rest}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        list={listId}
        value={value}
        onChange={onChange}
        className={`w-full rounded-2xl border border-dashed border-peach bg-card px-5 py-4 text-base text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus:border-solid focus:border-primary focus:shadow-soft ${
          rest.className ?? ""
        }`}
      />
      <datalist id={listId}>
        {EMAIL_DOMAINS.map((d) => (
          <option key={d} value={`${local}@${d}`} />
        ))}
      </datalist>
      {showSuggestions && (
        <div className="flex flex-wrap gap-1.5">
          {EMAIL_DOMAINS.slice(0, 5).map((d) => {
            const full = `${local}@${d}`;
            const active = value.toLowerCase() === full.toLowerCase();
            return (
              <button
                key={d}
                type="button"
                onClick={() => handleSuggestionClick(d)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                @{d}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  showCount?: boolean;
}

export function TextArea({ showCount, ...props }: TextAreaProps) {
  const value = String(props.value ?? "");
  const max = typeof props.maxLength === "number" ? props.maxLength : undefined;
  return (
    <div className="relative">
      <textarea
        {...props}
        rows={props.rows ?? 5}
        className={`w-full resize-none rounded-2xl border border-dashed border-peach bg-card px-5 py-4 text-base leading-relaxed text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus:border-solid focus:border-primary focus:shadow-soft ${
          props.className ?? ""
        }`}
      />
      {showCount && max !== undefined && (
        <>
          {/* Desktop: floating in textarea bottom-right */}
          <span
            className={`pointer-events-none absolute bottom-3 right-4 hidden rounded bg-card/90 px-1.5 py-0.5 text-xs tabular-nums sm:inline-block ${
              value.length > max * 0.85 ? "text-primary" : "text-muted-foreground/70"
            }`}
          >
            {value.length} / {max}
          </span>
          {/* Mobile: always-visible counter below the textarea, no scroll needed */}
          <div
            className={`mt-1.5 text-right text-xs tabular-nums sm:hidden ${
              value.length > max * 0.85 ? "text-primary" : "text-muted-foreground/70"
            }`}
          >
            {value.length} / {max}
          </div>
        </>
      )}
    </div>
  );
}

interface TipChipsProps {
  label?: string;
  chips: string[];
}

export function TipChips({ label = "Try mentioning", chips }: TipChipsProps) {
  if (!chips.length) return null;
  return (
    <div className="mt-4">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-border/70 bg-secondary/70 px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground"
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}
