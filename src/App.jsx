import { useState } from "react";
import "./App.css";

const BACKEND_URL = "http://localhost:8000";

function StepIndicator({ current }) {
  return (
    <div className="step-indicator">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className={`step-dot ${current === s ? "active" : current > s ? "done" : ""}`} />
      ))}
    </div>
  );
}

function AgentCard({ emoji, name, status, message }) {
  const cls = status === "running" ? "agent-card running" : status === "done" ? "agent-card done" : "agent-card";
  return (
    <div className={cls}>
      <span className="agent-emoji">{emoji}</span>
      <div>
        <strong>{name}</strong>
        <p>{message}</p>
      </div>
      {status === "running" && <span className="spinner" />}
      {status === "done" && <span className="checkmark">✓</span>}
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(1);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [members, setMembers] = useState(["", ""]);
  const [instructions, setInstructions] = useState("");
  const [paypalUsername, setPaypalUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState({});
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function addMember() { setMembers([...members, ""]); }

  function updateMember(i, val) {
    const updated = [...members];
    updated[i] = val;
    setMembers(updated);
  }

  function removeMember(i) {
    if (members.length <= 2) return;
    setMembers(members.filter((_, idx) => idx !== i));
  }

  function setAgentStatus(agent, status, message) {
    setAgentStatuses((prev) => ({ ...prev, [agent]: { status, message } }));
  }

  async function runAgents() {
    setLoading(true);
    setError(null);
    setStep(4);
    const validMembers = members.filter((m) => m.trim() !== "");

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });

    setAgentStatus("accountant", "running", "Scanning receipt...");

    try {
      const response = await fetch(`${BACKEND_URL}/api/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          members: validMembers,
          instructions,
          paypalUsername,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Backend error");

      setAgentStatus("accountant", "done",
        `Receipt scanned. Total: $${data.accountant.total?.toFixed(2)} — ${data.accountant.item_count} items detected.`
      );
      await delay(400);
      setAgentStatus("divider", "running", "Applying your split rules...");
      await delay(600);
      setAgentStatus("divider", "done", data.divider.method || "Split calculated.");
      await delay(400);
      setAgentStatus("auditor", "running", "Verifying totals...");
      await delay(500);
      setAgentStatus("auditor", "done", data.auditor.message);
      await delay(400);
      setAgentStatus("collector", "running", "Generating payment links...");
      await delay(500);
      setAgentStatus("collector", "done", "Payment links generated. Share them to collect!");

      setResults(data);
    } catch (err) {
      setError(err.message);
      setStep(3);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(1);
    setImageFile(null);
    setImagePreview(null);
    setMembers(["", ""]);
    setInstructions("");
    setPaypalUsername("");
    setResults(null);
    setError(null);
    setAgentStatuses({});
  }

  return (
    <div className="app-bg">
      <div className="card">
        <h1 className="logo"><span className="split">Split</span><span className="smart">Smart</span></h1>
        <p className="tagline">AI-powered receipt splitting — fair, fast, friction-free.</p>
        <StepIndicator current={step} />

        {step === 1 && (
          <div className="step">
            <h2>🧾 Upload Your Receipt</h2>
            <p className="sub">Take a photo or upload an image of your receipt.</p>
            <div
              className="dropzone"
              onClick={() => document.getElementById("file-input").click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
              }}
            >
              {imagePreview
                ? <img src={imagePreview} alt="receipt preview" className="preview-img" />
                : <><div className="upload-icon">🧾</div><p>Drag and drop or select a file</p></>
              }
            </div>
            <input id="file-input" type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageChange} />
            <button className="btn-primary" disabled={!imageFile} onClick={() => setStep(2)}>Next →</button>
          </div>
        )}

        {step === 2 && (
          <div className="step">
            <h2>👥 Who's in the group?</h2>
            <p className="sub">Add the names of everyone splitting the bill.</p>
            {members.map((m, i) => (
              <div key={i} className="member-row">
                <input className="input" value={m} placeholder={`Person ${i + 1}`} onChange={(e) => updateMember(i, e.target.value)} />
                {members.length > 2 && <button className="btn-remove" onClick={() => removeMember(i)}>✕</button>}
              </div>
            ))}
            <button className="btn-link" onClick={addMember}>+ Add person</button>
            <div className="btn-row">
              <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="btn-primary" disabled={members.filter(m => m.trim()).length < 2} onClick={() => setStep(3)}>Next →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step">
            <h2>📝 Any special rules?</h2>
            <p className="sub">Tell the AI how to split — or leave blank for an even split.</p>
            <textarea
              className="textarea"
              rows={4}
              placeholder="e.g. Zaynab and Jamal split the nachos. Everyone splits drinks evenly."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
            <p className="sub" style={{ marginTop: "1rem" }}>PayPal.me username (optional)</p>
            <input className="input" placeholder="e.g. zaynab" value={paypalUsername} onChange={(e) => setPaypalUsername(e.target.value)} />
            {error && <div className="error-msg">⚠️ {error}</div>}
            <div className="btn-row">
              <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
              <button className="btn-primary" disabled={loading} onClick={runAgents}>🤖 Run Agents</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step">
            <h2>✅ Results</h2>
            <p className="sub">Here's the breakdown. Share the links to collect payments!</p>
            <AgentCard emoji="🧾" name="Accountant Agent" status={agentStatuses.accountant?.status || "pending"} message={agentStatuses.accountant?.message || "Waiting..."} />
            <AgentCard emoji="➗" name="Divider Agent" status={agentStatuses.divider?.status || "pending"} message={agentStatuses.divider?.message || "Waiting..."} />
            <AgentCard emoji="✅" name="Auditor Agent" status={agentStatuses.auditor?.status || "pending"} message={agentStatuses.auditor?.message || "Waiting..."} />
            <AgentCard emoji="💸" name="Collector Agent" status={agentStatuses.collector?.status || "pending"} message={agentStatuses.collector?.message || "Waiting..."} />

            {results?.collector?.payments && (
              <div className="payments-table">
                {results.collector.payments.map((p, i) => (
                  <div key={i} className="payment-row">
                    <span className="payment-name">{p.name}</span>
                    <span className="payment-amount">${p.amount.toFixed(2)}</span>
                    <a href={p.link} target="_blank" rel="noreferrer" className="btn-paypal">Pay via PayPal</a>
                  </div>
                ))}
              </div>
            )}

            {!loading && (
              <button className="btn-secondary" style={{ marginTop: "1rem" }} onClick={reset}>Start over</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}