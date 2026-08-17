import 'package:flutter/material.dart';
import '../services/data_service.dart';
import '../theme/app_theme.dart';

/// Separate form for donation seekers (needy) — not for donors.
class ApplyScreen extends StatefulWidget {
  const ApplyScreen({super.key});

  @override
  State<ApplyScreen> createState() => _ApplyScreenState();
}

class _ApplyScreenState extends State<ApplyScreen> {
  final _formKey = GlobalKey<FormState>();
  final nameCtrl = TextEditingController();
  final phoneCtrl = TextEditingController();
  final cityCtrl = TextEditingController();
  final titleCtrl = TextEditingController();
  final descCtrl = TextEditingController();
  final amountCtrl = TextEditingController();
  final vendorCtrl = TextEditingController();
  String category = 'medical';
  String urgency = 'medium';
  bool loading = false;

  @override
  void dispose() {
    nameCtrl.dispose();
    phoneCtrl.dispose();
    cityCtrl.dispose();
    titleCtrl.dispose();
    descCtrl.dispose();
    amountCtrl.dispose();
    vendorCtrl.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => loading = true);
    final rec = await DataService.saveApplication({
      'fullName': nameCtrl.text.trim(),
      'phone': phoneCtrl.text.trim(),
      'city': cityCtrl.text.trim(),
      'title': titleCtrl.text.trim(),
      'description': descCtrl.text.trim(),
      'amountNeeded': double.tryParse(amountCtrl.text) ?? 0,
      'category': category,
      'urgency': urgency,
      'vendorName': vendorCtrl.text.trim(),
    });
    if (!mounted) return;
    setState(() => loading = false);
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Application received'),
        content: Text(
          'Case ID: ${rec['id']}\n\nStatus: pending review.\nFunds go only to hospitals, schools, or vendors — never personal cash.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('OK'),
          ),
        ],
      ),
    );
    _formKey.currentState!.reset();
    nameCtrl.clear();
    phoneCtrl.clear();
    cityCtrl.clear();
    titleCtrl.clear();
    descCtrl.clear();
    amountCtrl.clear();
    vendorCtrl.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Apply for help'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).maybePop(),
            child: const Text('Donor?'),
          ),
        ],
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Text(
                  'This form is only for people who need support. '
                  'Donors use a separate login. Payment goes to verified institutions only.',
                  style: TextStyle(fontSize: 13),
                ),
              ),
              const SizedBox(height: 16),
              const Text('1. Personal', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              TextFormField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Full name *', prefixIcon: Icon(Icons.person_outline)),
                validator: (v) => (v == null || v.trim().length < 3) ? 'Enter full name' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Mobile *', hintText: '03XX XXXXXXX', prefixIcon: Icon(Icons.phone_android)),
                validator: (v) => (v == null || v.trim().length < 10) ? 'Valid mobile required' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: cityCtrl,
                decoration: const InputDecoration(labelText: 'City *', prefixIcon: Icon(Icons.location_city_outlined)),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'City required' : null,
              ),
              const SizedBox(height: 20),
              const Text('2. What do you need?', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: category,
                decoration: const InputDecoration(labelText: 'Category'),
                items: const [
                  DropdownMenuItem(value: 'medical', child: Text('Medical')),
                  DropdownMenuItem(value: 'education', child: Text('Education')),
                  DropdownMenuItem(value: 'food', child: Text('Food')),
                  DropdownMenuItem(value: 'utility', child: Text('Utility')),
                  DropdownMenuItem(value: 'emergency', child: Text('Emergency')),
                ],
                onChanged: (v) => setState(() => category = v ?? 'medical'),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: urgency,
                decoration: const InputDecoration(labelText: 'Urgency'),
                items: const [
                  DropdownMenuItem(value: 'critical', child: Text('Critical')),
                  DropdownMenuItem(value: 'high', child: Text('High')),
                  DropdownMenuItem(value: 'medium', child: Text('Medium')),
                ],
                onChanged: (v) => setState(() => urgency = v ?? 'medium'),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: titleCtrl,
                decoration: const InputDecoration(labelText: 'Short title *', hintText: 'e.g. Surgery at Mayo Hospital'),
                validator: (v) => (v == null || v.trim().length < 8) ? 'Clear title required' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: descCtrl,
                maxLines: 4,
                decoration: const InputDecoration(labelText: 'Describe the need *', alignLabelWithHint: true),
                validator: (v) => (v == null || v.trim().length < 20) ? 'Please add more detail' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: amountCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Amount needed (PKR) *', prefixIcon: Icon(Icons.payments_outlined)),
                validator: (v) {
                  final n = double.tryParse(v ?? '');
                  if (n == null || n < 1000) return 'Minimum PKR 1,000';
                  return null;
                },
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: vendorCtrl,
                decoration: const InputDecoration(
                  labelText: 'Hospital / school / vendor',
                  hintText: 'Where should payment go?',
                  prefixIcon: Icon(Icons.business_outlined),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: loading ? null : submit,
                child: loading
                    ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Submit application'),
              ),
              const SizedBox(height: 8),
              Text(
                'You will get a Case ID. Status updates via SMS when backend is connected.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
