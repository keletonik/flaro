import { useState, useCallback } from "react";
import { Upload, X, FileSpreadsheet, ArrowRight, Check, AlertTriangle } from "lucide-react";
import { parseCSV } from "@/lib/api";
import { cn } from "@/lib/utils";

interface FieldMapping {
  csvColumn: string;
  dbField: string;
}

interface CSVImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (rows: Record<string, string>[], columnMap: Record<string, string>) => Promise<void>;
  availableFields: { key: string; label: string; required?: boolean }[];
  title?: string;
}

export default function CSVImportModal({ open, onClose, onImport, availableFields, title = "Import CSV" }: CSVImportModalProps) {
  const [step, setStep] = useState<"upload" | "map" | "importing" | "done">("upload");
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: Record<string, string>[] }>({ headers: [], rows: [] });
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [error, setError] = useState("");
  const [importCount, setImportCount] = useState(0);

  const handleFile = useCallback((file: File) => {
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) { setError("Could not read file"); return; }
      const parsed = parseCSV(text);
      if (!parsed.headers.length) { setError("No headers found in CSV"); return; }
      if (!parsed.rows.length) { setError("No data rows found"); return; }
      setCsvData(parsed);
      // Auto-map columns with fuzzy matching
      const autoMappings: FieldMapping[] = [];
      for (const field of availableFields) {
        const match = parsed.headers.find(h => {
          const hl = h.toLowerCase().replace(/[^a-z0-9]/g, "");
          const fl = field.key.toLowerCase().replace(/[^a-z0-9]/g, "");
          const ll = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");
          return hl === fl || hl === ll || hl.includes(fl) || fl.includes(hl) || hl.includes(ll);
        });
        if (match) autoMappings.push({ csvColumn: match, dbField: field.key });
      }
      setMappings(autoMappings);
      setStep("map");
    };
    reader.readAsText(file);
  }, [availableFields]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) handleFile(file);
    else setError("Please upload a CSV file");
  }, [handleFile]);

  const handleImport = async () => {
    const columnMap: Record<string, string> = {};
    mappings.forEach(m => { columnMap[m.csvColumn] = m.dbField; });
    setStep("importing");
    try {
      await onImport(csvData.rows, columnMap);
      setImportCount(csvData.rows.length);
      setStep("done");
    } catch (err: any) {
      setError(err.message || "Import failed");
      setStep("map");
    }
  };

  const updateMapping = (csvCol: string, dbField: string) => {
    setMappings(prev => {
      const filtered = prev.filter(m => m.csvColumn !== csvCol);
      if (dbField) filtered.push({ csvColumn: csvCol, dbField });
      return filtered;
    });
  };

  const reset = () => {
    setStep("upload");
    setCsvData({ headers: [], rows: [] });
    setMappings([]);
    setError("");
    setImportCount(0);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet size={16} className="text-primary" />
            <h3 className="font-semibold text-foreground text-sm">{title}</h3>
          </div>
          <button onClick={() => { reset(); onClose(); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-destructive/10 text-destructive text-xs">
              <AlertTriangle size={12} /> {error}
            </div>
          )}

          {step === "upload" && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed border-border hover:border-primary/40 rounded-xl p-8 text-center transition-colors cursor-pointer"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file"; input.accept = ".csv";
                input.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleFile(f); };
                input.click();
              }}
            >
              <Upload size={28} className="mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Drop your CSV file here</p>
              <p className="text-xs text-muted-foreground">or click to browse</p>
            </div>
          )}

          {step === "map" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{csvData.rows.length} rows found. Map columns to fields:</p>
              <div className="space-y-1.5">
                {csvData.headers.map(header => {
                  const current = mappings.find(m => m.csvColumn === header)?.dbField || "";
                  return (
                    <div key={header} className="flex items-center gap-2 text-xs">
                      <span className="w-[40%] truncate text-foreground font-medium">{header}</span>
                      <ArrowRight size={10} className="text-muted-foreground shrink-0" />
                      <select
                        value={current}
                        onChange={e => updateMapping(header, e.target.value)}
                        className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                      >
                        <option value="">Skip</option>
                        {availableFields.map(f => (
                          <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">Preview: first {Math.min(3, csvData.rows.length)} rows will be imported with {mappings.length} mapped fields</p>
            </div>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center py-8">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-medium text-foreground">Importing {csvData.rows.length} records...</p>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center py-8">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                <Check size={20} className="text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Import complete</p>
              <p className="text-xs text-muted-foreground">{importCount} records imported successfully</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          {step === "map" && (
            <>
              <button onClick={reset} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={mappings.length === 0}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  mappings.length > 0 ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-muted text-muted-foreground"
                )}
              >
                Import {csvData.rows.length} rows
              </button>
            </>
          )}
          {step === "done" && (
            <button onClick={() => { reset(); onClose(); }} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
