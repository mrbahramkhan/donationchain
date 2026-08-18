import 'package:flutter/material.dart';
import '../services/data_service.dart';
import '../theme/app_theme.dart';
import 'donate_screen.dart';

/// Nisab + Hawl-aware Zakat calculator (aligned with web js/zakat.js).
class ZakatScreen extends StatefulWidget {
  const ZakatScreen({super.key});

  @override
  State<ZakatScreen> createState() => _ZakatScreenState();
}

class _ZakatScreenState extends State<ZakatScreen> {
  static const double lunarYearDays = 354.367;
  static const double goldPricePerTola = 240000;
  static const double silverPricePerTola = 2800;
  static const double nisabGoldTola = 7.5; // ≈ 87.48 g
  static const double rate = 0.025;

  final goldCtrl = TextEditingController();
  final silverCtrl = TextEditingController();
  final cashCtrl = TextEditingController(text: '500000');
  final businessCtrl = TextEditingController();

  int? zakatDue;
  int? remaining;
  double? netWealth;
  double? nisab;
  bool aboveNisab = false;
  bool hawlComplete = false;
  bool declareHawl = false;
  String hawlMessage = '';
  double hawlProgress = 0;
  int? daysRemaining;

  @override
  void dispose() {
    goldCtrl.dispose();
    silverCtrl.dispose();
    cashCtrl.dispose();
    businessCtrl.dispose();
    super.dispose();
  }

  Future<void> calculate() async {
    final gold = double.tryParse(goldCtrl.text) ?? 0;
    final silver = double.tryParse(silverCtrl.text) ?? 0;
    final cash = double.tryParse(cashCtrl.text) ?? 0;
    final business = double.tryParse(businessCtrl.text) ?? 0;
    final total = gold * goldPricePerTola + silver * silverPricePerTola + cash + business;
    final nisabVal = nisabGoldTola * goldPricePerTola;
    final above = total >= nisabVal;

    final state = await DataService.getHawlState();
    DateTime? hawlStart = state['hawlStart'] != null ? DateTime.tryParse(state['hawlStart'] as String) : null;
    final declared = declareHawl || (state['declaredComplete'] == true);

    String message;
    bool complete = false;
    double progress = 0;
    int? remainDays;

    if (!above) {
      message = 'Wealth is below Nisab. Hawl reset. Zakat is not due.';
      hawlStart = null;
      complete = false;
      await DataService.saveHawlState({
        ...state,
        'hawlStart': null,
        'declaredComplete': false,
      });
    } else if (declared) {
      complete = true;
      progress = 100;
      message = 'Hawl complete (declared). Zakat is due on current zakatable wealth.';
      await DataService.saveHawlState({
        ...state,
        'hawlStart': hawlStart?.toIso8601String() ??
            DateTime.now().subtract(Duration(days: lunarYearDays.round())).toIso8601String(),
        'declaredComplete': true,
      });
    } else {
      hawlStart ??= DateTime.now();
      final held = DateTime.now().difference(hawlStart).inDays;
      complete = held >= lunarYearDays;
      progress = (held / lunarYearDays * 100).clamp(0, 100);
      remainDays = complete ? 0 : (lunarYearDays - held).ceil();
      message = complete
          ? 'Hawl complete. Zakat is due on current zakatable wealth.'
          : 'Hawl in progress. Zakat due after one lunar year above Nisab ($remainDays days remaining).';
      await DataService.saveHawlState({
        ...state,
        'hawlStart': hawlStart.toIso8601String(),
        'declaredComplete': false,
      });
    }

    final due = (above && complete) ? (total * rate).round() : 0;
    final payments = List<Map<String, dynamic>>.from(state['payments'] ?? []);
    final paid = payments.fold<double>(0, (s, p) => s + ((p['amount'] as num?)?.toDouble() ?? 0));
    final rem = (due - paid).clamp(0, double.infinity).round();

    setState(() {
      netWealth = total;
      nisab = nisabVal;
      aboveNisab = above;
      hawlComplete = complete;
      hawlMessage = message;
      hawlProgress = progress;
      daysRemaining = remainDays;
      zakatDue = due;
      remaining = rem;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Zakat Calculator')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Text(
                'Nisab (gold standard) + Hawl (one lunar year). '
                'Zakat is 2.5% only when wealth ≥ Nisab and Hawl is complete. '
                'Distribute only to Zakat-eligible verified cases. '
                'Policy is overseen by the Shariah Compliance Board (asnaf rules, no cash to personal accounts).',
                style: TextStyle(fontSize: 13),
              ),
            ),
            const SizedBox(height: 20),
            _field(goldCtrl, 'Gold (tola)', Icons.diamond_outlined),
            _field(silverCtrl, 'Silver (tola)', Icons.monetization_on_outlined),
            _field(cashCtrl, 'Cash / Bank (PKR)', Icons.account_balance_wallet_outlined),
            _field(businessCtrl, 'Business Assets (PKR)', Icons.storefront_outlined),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: declareHawl,
              onChanged: (v) => setState(() => declareHawl = v ?? false),
              title: const Text(
                'I declare this wealth has been above Nisab for one lunar year (Hawl)',
                style: TextStyle(fontSize: 13),
              ),
              controlAffinity: ListTileControlAffinity.leading,
            ),
            ElevatedButton(
              onPressed: calculate,
              child: const Text('Calculate Zakat (Nisab + Hawl)'),
            ),
            if (zakatDue != null) ...[
              const SizedBox(height: 24),
              Card(
                color: const Color(0xFFECFDF5),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Text(
                        'Zakatable: PKR ${netWealth!.toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 13),
                      ),
                      Text(
                        'Nisab: PKR ${nisab!.toStringAsFixed(0)}',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                      ),
                      const SizedBox(height: 8),
                      LinearProgressIndicator(
                        value: hawlProgress / 100,
                        backgroundColor: Colors.grey.shade200,
                        color: hawlComplete ? AppTheme.success : AppTheme.primary,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        hawlMessage,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          color: hawlComplete
                              ? AppTheme.success
                              : (aboveNisab ? AppTheme.primary : Colors.orange.shade800),
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Text('Zakat due (2.5%)', style: TextStyle(fontSize: 14)),
                      Text(
                        'PKR ${zakatDue!.toStringAsFixed(0)}',
                        style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.success,
                        ),
                      ),
                      Text(
                        'Remaining after platform payments: PKR ${remaining!.toStringAsFixed(0)}',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                      ),
                      if (hawlComplete && (zakatDue ?? 0) > 0) ...[
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const DonateScreen(isZakat: true),
                                ),
                              );
                            },
                            child: const Text('Distribute to Eligible Cases'),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _field(TextEditingController c, String label, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: c,
        keyboardType: TextInputType.number,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon),
        ),
      ),
    );
  }
}
