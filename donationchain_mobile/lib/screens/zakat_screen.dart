import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'donate_screen.dart';

class ZakatScreen extends StatefulWidget {
  const ZakatScreen({super.key});

  @override
  State<ZakatScreen> createState() => _ZakatScreenState();
}

class _ZakatScreenState extends State<ZakatScreen> {
  final goldCtrl = TextEditingController();
  final silverCtrl = TextEditingController();
  final cashCtrl = TextEditingController();
  final businessCtrl = TextEditingController();
  int? zakatAmount;

  void calculate() {
    final gold = double.tryParse(goldCtrl.text) ?? 0;
    final silver = double.tryParse(silverCtrl.text) ?? 0;
    final cash = double.tryParse(cashCtrl.text) ?? 0;
    final business = double.tryParse(businessCtrl.text) ?? 0;
    // Approx rates (demo)
    final goldValue = gold * 240000; // per tola
    final silverValue = silver * 2800;
    final total = goldValue + silverValue + cash + business;
    setState(() => zakatAmount = (total * 0.025).round());
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
                'Calculate your Zakat (2.5%) on gold, silver, cash and business assets. Nisab-aware distribution to verified eligible cases.',
                style: TextStyle(fontSize: 13),
              ),
            ),
            const SizedBox(height: 20),
            _field(goldCtrl, 'Gold (tola)', Icons.diamond_outlined),
            _field(silverCtrl, 'Silver (tola)', Icons.monetization_on_outlined),
            _field(cashCtrl, 'Cash / Bank (PKR)', Icons.account_balance_wallet_outlined),
            _field(businessCtrl, 'Business Assets (PKR)', Icons.storefront_outlined),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: calculate,
              child: const Text('Calculate Zakat'),
            ),
            if (zakatAmount != null) ...[
              const SizedBox(height: 24),
              Card(
                color: const Color(0xFFECFDF5),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      const Text('Your Zakat Amount', style: TextStyle(fontSize: 14)),
                      const SizedBox(height: 6),
                      Text(
                        'PKR ${zakatAmount!.toStringAsFixed(0)}',
                        style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.success,
                        ),
                      ),
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
