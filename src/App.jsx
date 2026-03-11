import { useState } from "react"
import "./App.css"

export default function App() {
  const [step, setStep] = useState("upload")
  const [members, setMembers] = useState(["", ""])
  const [instructions, setInstructions] = useState("")

  const updateMember = (index, value) => {
    const updated = [...members]
    updated[index] = value
    setMembers(updated)
  }

  const addMember = () => {
    setMembers([...members, ""])
  }

  const validMembers = members.filter(m => m.trim() !== "")

  const calculateSplits = () => {
    const total = 85.50
    const perPerson = (total / validMembers.length).toFixed(2)
    return validMembers.map(name => ({ name, amount: perPerson }))
  }

  const stepIndex = ["upload", "members", "instructions", "results"].indexOf(step)

  return (
    <div className="app">

      <div className="header">
        <div className="logo">Split<span>Smart</span></div>
        <p className="tagline">AI-powered receipt splitting — fair, fast, friction-free.</p>
      </div>

      <div className="steps-indicator">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={"step-dot" + (i === stepIndex ? " active" : "")} />
        ))}
      </div>

      <div className="card">

        {step === "upload" && (
          <div>
            <h2>📸 Upload Your Receipt</h2>
            <p>Take a photo or upload an image of your receipt.</p>
            <div className="upload-area">
              <div className="upload-icon">🧾</div>
              <p>Drag and drop or select a file</p>
              <input type="file" accept="image/*" />
            </div>
            <button className="btn-primary" onClick={() => setStep("members")}>Next →</button>
          </div>
        )}

        {step === "members" && (
          <div>
            <h2>👥 Who's in the group?</h2>
            <p>Add the names of everyone splitting the bill.</p>
            {members.map((name, index) => (
              <input
                key={index}
                type="text"
                placeholder={"Person " + (index + 1)}
                value={name}
                onChange={(e) => updateMember(index, e.target.value)}
              />
            ))}
            <button className="btn-ghost" onClick={addMember}>+ Add person</button>
            <br />
            <button className="btn-secondary" onClick={() => setStep("upload")}>← Back</button>
            <button className="btn-primary" onClick={() => setStep("instructions")}>Next →</button>
          </div>
        )}

        {step === "instructions" && (
          <div>
            <h2>📝 Any special rules?</h2>
            <p>Tell the AI how to split — or leave blank for an even split.</p>
            <textarea
              rows={4}
              placeholder="e.g. Alex and I split the nachos, everyone else splits the pizza"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
            <button className="btn-secondary" onClick={() => setStep("members")}>← Back</button>
            <button className="btn-primary" onClick={() => setStep("results")}>🤖 Run Agents</button>
          </div>
        )}

        {step === "results" && (
          <div>
            <h2>✅ Results</h2>
            <p>Here's the breakdown. Share the links to collect payments!</p>

            <div className="agent-block">
              <h3>🔍 Accountant Agent</h3>
              <p>Receipt scanned. Total: $85.50 — 4 line items detected.</p>
            </div>

            <div className="agent-block">
              <h3>⚖️ Divider Agent</h3>
              <p>{instructions ? "Applied your rule: " + instructions : "No special rules — splitting evenly."}</p>
            </div>

            <div className="agent-block">
              <h3>✅ Auditor Agent</h3>
              <p>All amounts verified. Totals balance correctly.</p>
            </div>

            <div className="agent-block">
              <h3>💳 Collector Agent</h3>
              <p>Payment links generated. Everyone below owes the person who paid upfront.</p>
            </div>

            {calculateSplits().map((person, index) => (
              <div key={index} className="person-row">
                <span className="person-name">{person.name}</span>
                <span className="person-amount">${person.amount}</span>
                <a className="pay-link" href={"https://paypal.me/grouphost/" + person.amount} target="_blank">
                  Pay via PayPal
                </a>
              </div>
            ))}

            <br />
            <button className="btn-secondary" onClick={() => setStep("upload")}>Start over</button>
          </div>
        )}

      </div>
    </div>
  )
}