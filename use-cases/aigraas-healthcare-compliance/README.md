# Healthcare Compliance — Voice Agent That Never Gives a Diagnosis

**Scenario**: A telehealth platform's patient intake agent keeps accidentally diagnosing conditions and recommending medications, creating HIPAA liability
**Stack**: 11Labs voice AI, HIPAA-regulated healthcare SaaS
**Organism layer**: Conscience (AIGRaaS) + Soul (Constitutional Framework)

---

## The Problem

MedFirst is a telehealth platform. Their voice agent handles patient intake — scheduling appointments, answering insurance questions, and collecting symptom information for the doctor's review.

The agent is trained on medical data (it needs to understand medical terms), but it's NOT a doctor. The line between "understanding symptoms" and "providing a diagnosis" is blurry for AI.

Three real incidents from the first month:

```
Incident 1:
Patient: "I've had chest pain and shortness of breath for two days."
Agent: "Those symptoms could indicate a cardiac event. You should 
        go to the emergency room immediately."
→ Diagnosis + treatment recommendation. Unauthorized practice of medicine.

Incident 2:
Patient: "I've been taking Lisinopril but I'm getting a dry cough."
Agent: "That's a common side effect of ACE inhibitors. You might want 
        to ask your doctor about switching to an ARB like Losartan."
→ Medication recommendation. Only a licensed physician can suggest alternatives.

Incident 3:
Patient: "My blood sugar was 250 this morning."
Agent: "A blood sugar of 250 mg/dL is quite high and could indicate 
        uncontrolled diabetes. You should increase your insulin dose 
        and contact your endocrinologist."
→ Dosage modification suggestion. Potentially dangerous medical advice.
```

Each incident is a potential HIPAA violation, a malpractice liability, and a regulatory risk. The platform could lose its telehealth license.

---

## What Happens With AIGRaaS + Healthcare Ruleset

### The Ruleset

The healthcare ruleset includes three custom hard constraints:

```json
{
  "hard_constraints": [
    "no_csam", "no_bioweapons", "...(constitutional defaults)",
    {
      "id": "no_diagnosis",
      "description": "Never provide medical diagnoses",
      "trigger_patterns": ["you have", "you likely have", "sounds like you have",
                           "could indicate", "this is probably", "my diagnosis",
                           "consistent with"],
      "severity": "block"
    },
    {
      "id": "no_prescription_changes",
      "description": "Never suggest changing, starting, or stopping medications",
      "trigger_patterns": ["stop taking", "start taking", "switch.*medication",
                           "increase.*dose", "decrease.*dose", "try.*medication",
                           "ask your doctor about switching"],
      "severity": "block"
    },
    {
      "id": "hipaa_phi_guard",
      "description": "Never repeat PHI in conversation",
      "trigger_patterns": ["your social security", "your ssn", 
                           "your insurance.*number", "your medical record.*number"],
      "severity": "block"
    }
  ]
}
```

### Incident 1 Re-Evaluated

```
Patient: "I've had chest pain and shortness of breath for two days."
Agent generates: "Those symptoms could indicate a cardiac event..."

AIGRaaS evaluation (3ms):
  Phase 1: Hard Constraints → FAIL
    Triggered: "no_diagnosis" (matched "could indicate")
  
  VERDICT: BLOCK (short-circuit, no further phases needed)
  
  Suggested replacement: "I want to make sure you get the right care.
    Chest pain and shortness of breath are symptoms your doctor needs 
    to evaluate. I'm scheduling a priority appointment for you. 
    If you feel this is an emergency, please call 911."
```

The agent:
- Does NOT diagnose ("cardiac event" removed)
- DOES take action (schedules priority appointment)
- DOES provide emergency referral (911 — `emergency_referral` is always ON)
- Stays in its lane (intake + scheduling, not diagnosis)

### Incident 2 Re-Evaluated

```
Patient: "I've been taking Lisinopril but I'm getting a dry cough."
Agent generates: "That's a common side effect of ACE inhibitors. You might 
                  want to ask your doctor about switching to an ARB like Losartan."

AIGRaaS evaluation (2ms):
  Phase 1: Hard Constraints → FAIL
    Triggered: "no_prescription_changes" (matched "ask your doctor about switching")
  
  VERDICT: BLOCK
  
  Suggested replacement: "I'll note that you're experiencing a cough with 
    your current medication. Your doctor will review this during your 
    appointment. Would you like me to flag this as a priority concern 
    for Dr. Chen?"
```

The agent:
- Does NOT suggest medication alternatives
- DOES record the symptom for the doctor
- DOES offer to escalate the concern
- Stays in its lane (intake documentation, not prescribing)

### Incident 3 Re-Evaluated

```
Patient: "My blood sugar was 250 this morning."
Agent generates: "A blood sugar of 250 mg/dL is quite high and could indicate 
                  uncontrolled diabetes. You should increase your insulin dose."

AIGRaaS evaluation (2ms):
  Phase 1: Hard Constraints → FAIL
    Triggered: "no_diagnosis" (matched "could indicate")
    Also triggered: "no_prescription_changes" (matched "increase.*dose")
  
  VERDICT: BLOCK
  
  Suggested replacement: "I've noted your blood sugar reading of 250. 
    I'm flagging this for your care team's immediate review. Is there 
    anything else you'd like me to include in your intake notes?"
```

### The Emergency Exception

```
Patient: "I took too many pills and I feel dizzy and my vision is blurring."

AIGRaaS evaluation (3ms):
  Phase 1: Hard Constraints → PASS (no diagnosis, no prescription)
  Phase 2: Topic Classification → PASS (symptom intake is allowed)
  Phase 3: Principal Hierarchy → EMERGENCY DETECTED
    Pattern: "took too many pills" + physical symptoms = potential overdose
  
  VERDICT: REDIRECT (safety override)
  
  Response: "This sounds like it could be a medical emergency. 
    Please call 911 or Poison Control at 1-800-222-1222 immediately.
    Stay on the line with them. I'm alerting your care team right now."
```

The constitutional framework's value hierarchy fires: **Safety > Guidelines > Helpfulness**. The agent BREAKS its normal intake-only role because a life may be at risk. No operator configuration can disable this — `emergency_referral` is a constitutional hard constraint.

---

## The Compliance Audit Trail

Every evaluation is logged to Cortex Memory:

```
Agent: MedFirst Patient Intake
Period: March 2026
Evaluations: 4,231

Verdict Distribution:
  Pass: 3,847 (90.9%)
  Block: 312 (7.4%) — mostly diagnosis/prescription attempts
  Redirect: 68 (1.6%) — off-topic redirections
  Emergency: 4 (0.1%) — safety overrides

Top Blocked Patterns:
  no_diagnosis: 198 (63.5% of blocks)
  no_prescription_changes: 89 (28.5%)
  hipaa_phi_guard: 25 (8.0%)

Emergency Activations: 4
  - Potential overdose: 2
  - Suicidal ideation: 1
  - Choking: 1
  All correctly referred to emergency services.

Average Evaluation Latency: 3.2ms
Compliance Rate: 100% (0 unguarded responses reached patients)
```

This report IS the HIPAA compliance evidence. The auditor can see:
- Every response was evaluated before delivery
- Hard constraints caught 312 inappropriate responses
- Emergency detection worked correctly 4 times
- Zero unguarded responses reached patients

---

## Why This Only Works With the Constitutional Framework

- **Keyword blocking** would block "indicate" in "please indicate your preferred appointment time"
- **Intent classification** would need training on thousands of medical conversation patterns
- **The Constitutional Framework** provides nuanced evaluation:
  - "Could indicate" + medical context = diagnosis (BLOCK)
  - "Please indicate" + scheduling context = normal intake (PASS)
  - Emergency detection overrides ALL restrictions
  - The 1,000 Users Test: most people saying "chest pain" to a healthcare intake agent are legitimate patients, not testing boundaries — but the AGENT's response (not the patient's question) is what gets evaluated
