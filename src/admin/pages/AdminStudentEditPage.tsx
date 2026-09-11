import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, SaveIcon, ShieldCheckIcon, ShieldAlertIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export function AdminStudentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [student, setStudent] = useState<any>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [nic, setNic] = useState('');
  const [dob, setDob] = useState('');
  const [guardian, setGuardian] = useState('');
  const [school, setSchool] = useState('');
  const [program, setProgram] = useState('');
  const [examYear, setExamYear] = useState('');
  const [stream, setStream] = useState('');
  const [medium, setMedium] = useState('');
  const [district, setDistrict] = useState('');
  const [gender, setGender] = useState('');
  const [verification, setVerification] = useState('pending');

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      if (data) {
        setStudent(data);
        setName(data.full_name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setNic(data.nic || '');
        setDob(data.birth_date || '');
        setGuardian(data.guardian_name || '');
        setSchool(data.school || '');
        setProgram(data.program || '');
        setExamYear(data.exam_year || '');
        setStream(data.stream || '');
        setMedium(data.medium || '');
        setDistrict(data.district || '');
        setGender(data.gender || '');
        setVerification(data.verification_status || 'pending');
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: name,
        email,
        phone,
        address,
        nic,
        birth_date: dob,
        guardian_name: guardian,
        school,
        program,
        exam_year: examYear,
        stream,
        medium,
        district,
        gender,
        verification_status: verification
      })
      .eq('id', id);

    setSaving(false);
    if (error) {
      alert('Failed to update student');
    } else {
      navigate(`/admin/students/${id}`);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading student data...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <Link to="/admin/students" className="hover:text-slate-900 transition-colors">Students</Link>
          <span>/</span>
          <Link to={`/admin/students/${id}`} className="hover:text-slate-900 transition-colors">{student?.full_name || 'Student'}</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">Edit</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/admin/students/${id}`)} className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors">
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Student</h1>
            <p className="text-sm text-slate-500 mt-1">Update profile and academic information</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="NIC" value={nic} onChange={(e) => setNic(e.target.value)} />
            <Input label="Date of Birth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            <Select label="Gender" options={[{value: 'Male', label: 'Male'}, {value: 'Female', label: 'Female'}, {value: 'Other', label: 'Other'}]} value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Select gender" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="District" value={district} onChange={(e) => setDistrict(e.target.value)} />
            <div className="sm:col-span-2">
              <Input label="Home Address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="sm:col-span-2 border-t border-slate-100 pt-5 mt-2">
              <Input label="Guardian Name" value={guardian} onChange={(e) => setGuardian(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Academic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Program" value={program} onChange={(e) => setProgram(e.target.value)} placeholder="e.g. A/L" />
            <Input label="Exam Year" value={examYear} onChange={(e) => setExamYear(e.target.value)} placeholder="e.g. 2027" />
            <Input label="Stream" value={stream} onChange={(e) => setStream(e.target.value)} />
            <Input label="Medium" value={medium} onChange={(e) => setMedium(e.target.value)} />
            <div className="sm:col-span-2">
              <Input label="School" value={school} onChange={(e) => setSchool(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
            Verification Status
          </h2>
          <div className="max-w-md">
            <Select 
              label="Account Verification" 
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved (Verified)' },
                { value: 'rejected', label: 'Rejected' }
              ]} 
              value={verification} 
              onChange={(e) => setVerification(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={() => navigate(`/admin/students/${id}`)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#c20f24] hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : <><SaveIcon className="w-4 h-4" /> Save changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}
