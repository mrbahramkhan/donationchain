import 'package:flutter/material.dart';
import '../models/donation_case.dart';
import '../services/data_service.dart';
import '../theme/app_theme.dart';

class DonateScreen extends StatefulWidget {
  final DonationCase? caseItem;
  final bool isZakat;

  const DonateScreen({super.key, this.caseItem, this.isZakat = false});

  @override
  State<DonateScreen> createState() => _DonateScreenState();
}

class _DonateScreenState extends State<DonateScreen> {
  final amountCtrl = TextEditingController(text: '5000');
  String method = 'jazzcash';
  bool anonymous = false;
  bool loading = false;

  final methods = {
    'jazzcash': 'JazzCash',
    'easypaisa': 'EasyPaisa',
    'raast': 'Raast',
    'stripe': 'Card (Stripe)',
  };

  Future<void> pay() async {
    final amount = int.tryParse(amountCtrl.text) ?? 0;
    if (amount < 100) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Minimum donation PKR 100')),
      );
      return;
    }
    setState(() => loading = true);
    await Future.delayed(const Duration(milliseconds: 1400));
    final record = DonationRecord(
      id: DateTime.now().millisecondsSinceEpoch,
      amount: amount,
      method: method,
      caseTitle: widget.isZakat
          ? 'Zakat Distribution'
          : (widget.caseItem?.title ?? 'General Support'),
      anonymous: anonymous,
      date: DateTime.now(),
      status: 'completed',
      proof: 'Vendor proof pending (within 48h)',
    );
    await DataService.saveDonation(record);
    if (!mounted) return;
    setState(() => loading = false);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: AppTheme.success),
            SizedBox(width: 8),
            Text('Payment Successful'),
          ],
        ),
        content: Text(
          'PKR ${amount.toStringAsFixed(0)} sent directly to verified vendor via ${methods[method]}.\n\nDigital receipt generated. Proof will appear in your Impact dashboard within 48 hours.',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
            },
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.isZakat
        ? 'Distribute Zakat'
        : (widget.caseItem?.title ?? 'General Donation');

    return Scaffold(
      appBar: AppBar(title: const Text('Donate Securely')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                    if (widget.caseItem != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        '${widget.caseItem!.city} • ${widget.caseItem!.vendor}',
                        style: TextStyle(color: Colors.grey.shade600),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            const Text('Amount (PKR)', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: amountCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(prefixText: 'PKR '),
            ),
            const SizedBox(height: 20),
            const Text('Payment Method', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            ...methods.entries.map((e) {
              return RadioListTile<String>(
                value: e.key,
                groupValue: method,
                onChanged: (v) => setState(() => method = v!),
                title: Text(e.value),
                activeColor: AppTheme.primary,
                contentPadding: EdgeInsets.zero,
              );
            }),
            CheckboxListTile(
              value: anonymous,
              onChanged: (v) => setState(() => anonymous = v ?? false),
              title: const Text('Donate anonymously'),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
              activeColor: AppTheme.primary,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: loading ? null : pay,
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: loading
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Pay Securely'),
                        SizedBox(width: 8),
                        Icon(Icons.lock, size: 18),
                      ],
                    ),
            ),
            const SizedBox(height: 12),
            Text(
              'PCI-DSS compliant • Funds go directly to verified vendor account. No cash to beneficiary.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
