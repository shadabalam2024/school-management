// ============================================================
// SCHOOL SETTINGS — Feature #8
// Edit school name, address, contact from UI
// ============================================================
import { useState, useEffect } from "react";
import { SettingsAPI, AuditAPI } from "../lib/api.js";
import { Store, useStore } from "../lib/store.js";
import { Field, Input, Btn, Card, PageHeader, Loading, Notice, THEME } from "../components/UI.jsx";

const DEFAULT = {
    school_name: "My School",
    school_address: "",
    school_phone: "",
    school_email: "",
    academic_year: "2024-25",
    currency: "₹",
};

export default function SchoolSettings({ currentUser }) {
    const { settings: storeSettings } = useStore();
    const [settings, setSettings] = useState({ ...DEFAULT, ...storeSettings });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Keep form in sync if store updates
    useEffect(() => {
        setSettings(s => ({ ...s, ...storeSettings }));
    }, [JSON.stringify(storeSettings)]);

    const f = k => e => setSettings(p => ({ ...p, [k]: e.target.value }));

    const handleSave = async () => {
        setSaving(true); setSaved(false);
        try {
            for (const [key, value] of Object.entries(settings)) {
                await SettingsAPI.set(key, value);
            }
            await AuditAPI.log(currentUser, "UPDATE", "school_settings", "all", "Updated school settings");
            // Reload store so changes reflect everywhere immediately
            await Store.loadAll();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    if (saving && !saved) return null; // keep form visible while saving

    return (
        <div>
            <PageHeader title="⚙️ School Settings"
                sub="Update school information shown on receipts and reports" />

            <Notice>Changes here update the school name and details shown on fee receipts and reports.</Notice>

            <Card style={{ maxWidth: 600 }}>
                <Field label="School Name">
                    <Input value={settings.school_name} onChange={f("school_name")} placeholder="e.g. Delhi Public School" />
                </Field>
                <Field label="Address">
                    <Input value={settings.school_address} onChange={f("school_address")} placeholder="Full school address" />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Field label="Phone">
                        <Input value={settings.school_phone} onChange={f("school_phone")} placeholder="Contact number" />
                    </Field>
                    <Field label="Email">
                        <Input type="email" value={settings.school_email} onChange={f("school_email")} placeholder="school@email.com" />
                    </Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Field label="Academic Year">
                        <Input value={settings.academic_year} onChange={f("academic_year")} placeholder="e.g. 2024-25" />
                    </Field>
                    <Field label="Currency Symbol">
                        <Input value={settings.currency} onChange={f("currency")} placeholder="₹" />
                    </Field>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                    <Btn onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "💾 Save Settings"}
                    </Btn>
                    {saved && (
                        <span style={{ color: THEME.success, fontSize: 13, fontWeight: 600 }}>
                            ✅ Settings saved!
                        </span>
                    )}
                </div>
            </Card>
        </div>
    );
}