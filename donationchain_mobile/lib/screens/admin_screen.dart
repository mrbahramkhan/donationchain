import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AdminScreen extends StatelessWidget {
  const AdminScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Admin Panel')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Super Admin Overview', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.4,
            children: [
              _kpi('Pending Cases', '47', '12 critical', AppTheme.warning),
              _kpi("Today's Donations", 'PKR 4.2M', '+18%', AppTheme.success),
              _kpi('Fraud Alerts', '3', 'Needs review', AppTheme.danger),
              _kpi('Vendor Payments', '12', 'SLA < 24h', AppTheme.primary),
            ],
          ),
          const SizedBox(height: 24),
          const Text('Case Pipeline', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          _pipelineCard('AI Screened', ['Medical — Risk 22', 'Food — Duplicate OK'], Colors.blue),
          _pipelineCard('Officer Review', ['Education — Docs pending', 'Utility — Home visit'], AppTheme.warning),
          _pipelineCard('Ready for Donor', ['Cancer case — Approved', 'School fee — Ready'], AppTheme.success),
          const SizedBox(height: 24),
          const Text('Fraud Alerts', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          Card(
            color: const Color(0xFFFEF2F2),
            child: ListTile(
              leading: const Icon(Icons.warning_amber, color: AppTheme.danger),
              title: const Text('Possible duplicate CNIC'),
              subtitle: const Text('Case #DC-8842 • Risk score 91'),
              trailing: TextButton(onPressed: () {}, child: const Text('Review')),
            ),
          ),
        ],
      ),
    );
  }

  Widget _kpi(String label, String value, String sub, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color)),
            Text(sub, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          ],
        ),
      ),
    );
  }

  Widget _pipelineCard(String title, List<String> items, Color color) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                const SizedBox(width: 8),
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 8),
            ...items.map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text('• $e', style: TextStyle(fontSize: 13, color: Colors.grey.shade700)),
                )),
          ],
        ),
      ),
    );
  }
}
