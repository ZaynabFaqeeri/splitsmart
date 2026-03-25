import { useState } from "react";
import "./App.css";

const STEPS = ["Upload", "Group", "Rules", "Results"];

export default function App() {
  const [step, setStep] = useState(0);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [members, setMembers] = useState(["", ""]);
  const [rules, setRules] = useState("");
  const [paypalUsername, setPaypalUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  const updateMember = (i, val) => {
    const updated = [...members];
    updated[i] = val;
    setMembers(updated);
  };

  const addMember = () => setMembers([...members, ""]);
  const removeMember = (i) => {
    if (members.length > 2) setMembers(members.filter((_, idx) => idx !== i));
  };

  const runAgents = async () => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("receipt", receiptFile);
    formData.append("members", members.filter((m) => m.trim()).join(","));
    formData.append("rules", rules || "Split evenly");
    formData.append("paypal_username", paypalUsername || "yourpaypal");
    try {
      const res = await fetch("http://localhost:5001/api/process", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Something went wrong.");
      }
      setResult(data);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0);
    setReceiptFile(null);
    setReceiptPreview(null);
    setMembers(["", ""]);
    setRules("");
    setPaypalUsername("");
    setResult(null);
    setError(null);
  };

  return (
    <div className="app-bg">
      <div className="card">
        <div className="header">
          <h1 className="logo">
            <span className="logo-split">Split</span>
            <span className="logo-smart">Smart</span>
          </h1>
          <p className="tagline">AI-powered receipt splitting — fair, fast, friction-free.</p>
          <div className="dots">
            {STEPS.map((s, i) => (
              <span key={s} className={`dot ${i === step ? "dot-active" : i < step ? "dot-done" : ""}`} />
            ))}
          </div>
        </div>

        {step === 0 && (
          <div className="section">
            <h2>🧾 Upload Your Receipt</h2>
            <p className="sub">Take a photo or upload an image of your receipt.</p>
            <div className="dropzone" onClick={() => document.getElementById("file-input").click()}>
              {receiptPreview ? (
                <img src={receiptPreview} alt="Receipt preview" className="preview-img" />
              ) : (
                <span className="drop-hint">Drag and drop or click to select a file</span>
              )}
            </div>
            <input id="file-input" type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
            {receiptFile && <p className="filename">📎 {receiptFile.name}</p>}
            <div className="row-right">
              <button className="btn-primary" disabled={!receiptFile} onClick={() => setStep(1)}>Next →</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="section">
            <h2>👥 Who's in the group?</h2>
            <p className="sub">Add the names of everyone splitting the bill.</p>
            {members.map((m, i) => (
              <div key={i} className="member-row">
                <input className="input" placeholder={`Person ${i + 1}`} value={m} onChange={(e) => updateMember(i, e.target.value)} />
                {members.length > 2 && <button className="btn-remove" onClick={() => removeMember(i)}>✕</button>}
              </div>
            ))}
            <button className="btn-link" onClick={addMember}>+ Add person</button>
            <div className="row-between">
              <button className="btn-secondary" onClick={() => setStep(0)}>← Back</button>
              <button className="btn-primary" disabled={members.filter((m) => m.trim()).length < 2} onClick={() => setStep(2)}>Next →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="section">
            <h2>📝 Any special rules?</h2>
            <p className="sub">Tell the AI how to split — or leave blank for an even split.</p>
            <textarea className="textarea" rows={4} placeholder="e.g. Zaynab and Jamal split the nachos. Everyone splits drinks evenly." value={rules} onChange={(e) => setRules(e.target.value)} />
            <div style={{ marginTop: "12px" }}>
              <label className="label">Your PayPal.me username</label>
              <input className="input" placeholder="e.g. zaynab (so links go to paypal.me/zaynab)" value={paypalUsername} onChange={(e) => setPaypalUsername(e.target.value)} />
            </div>
            {error && <div className="error-box">⚠️ {error}</div>}
            <div className="row-between">
              <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="btn-primary" disabled={loading} onClick={runAgents}>
                {loading ? "🤖 Running agents..." : "🤖 Run Agents"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div className="section">
            <h2>✅ Results</h2>
            <p className="sub">Here's the breakdown. Share the links to collect payments!</p>
            <div className="agent-card">
              <span className="agent-icon">🧾</span>
              <div>
                <strong>Accountant Agent</strong>
                <p className="agent-detail">Receipt scanned. Total ${result.accountant.total?.toFixed(2)} · {result.accountant.item_count} line items detected.</p>
              </div>
            </div>
            <div className="agent-card">
              <span className="agent-icon">➗</span>
              <div>
                <strong>Divider Agent</strong>
                <p className="agent-detail">Applied your rules: {result.divider.rules_applied}</p>
              </div>
            </div>
            <div className="agent-card">
              <span className="agent-icon">✅</span>
              <div>
                <strong>Auditor Agent</strong>
                <p className="agent-detail">{result.auditor.verified ? "All amounts verified. Totals balance correctly." : `Minor rounding adjustment applied ($${result.auditor.discrepancy?.toFixed(2)}).`}</p>
              </div>
            </div>
            <div className="agent-card">
              <span className="agent-icon">💸</span>
              <div>
                <strong>Collector Agent</strong>
                <p className="agent-detail">PayPal links generated for everyone.</p>
              </div>
            </div>
            <div className="payment-table">
              {Object.entries(result.collector.payment_links).map(([person, info]) => (
                <div key={person} className="payment-row">
                  <span className="person-name">{person}</span>
                  <span className="person-total">${info.total.toFixed(2)}</span>
                  <a href={info.paypal_link} target="_blank" rel="noreferrer" className="btn-pay">Pay via PayPal</a>
                </div>
              ))}
            </div>
            <div className="row-right" style={{ marginTop: "16px" }}>
              <button className="btn-secondary" onClick={reset}>Start over</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
