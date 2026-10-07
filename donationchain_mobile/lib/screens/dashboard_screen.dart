import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/donation_case.dart';
import '../services/data_service.dart';
import '../theme/app_theme.dart';
import '../services/notification_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  List<DonationRecord> donations = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final list = await DataService.getDonations();
    setState(() {
      donations = list;
      loading = false;
    });
  }

  int get total => donations.fold(0, (s, d) => s + d.amount);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Your Impact'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFEFF6FF), Color(0xFFECFEFF)],
                      ),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Lifetime Donated', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                        const SizedBox(height: 4),
                        Text(
                          '${NumberFormat('#,###').format(total)} (multi-currency total)',
                          style: const TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.primary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${donations.length} donations • ${donations.length * 2} lives impacted (est.)',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    onPressed: () async {
                      await NotificationService().showDemoNotification();
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Demo notification sent')),
                        );
                      }
                    },
                    icon: const Icon(Icons.notifications_active_outlined),
                    label: const Text('Test Push Notification'),
                  ),
                  const SizedBox(height: 24),
                  const Text('Recent Donations & Proofs', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  if (donations.isEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(28),
                        child: Column(
                          children: [
                            Icon(Icons.volunteer_activism, size: 52, color: Colors.grey.shade400),
                            const SizedBox(height: 14),
                            Text(
                              'No donations yet',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 16,
                                color: Colors.grey.shade800,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Browse verified cases and make your first impact. Receipts and vendor proofs will show up here.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.grey.shade600, fontSize: 13, height: 1.4),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Demo tip: use Cases tab → Donate',
                              style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    ...donations.map((d) => _donationTile(d)),
                ],
              ),
            ),
    );
  }

  Widget _donationTile(DonationRecord d) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: AppTheme.primary.withValues(alpha: 0.12),
          child: const Icon(Icons.favorite, color: AppTheme.primary, size: 20),
        ),
        title: Text(d.caseTitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(
          '${DateFormat('dd MMM yyyy • hh:mm a').format(d.date)} • ${d.method.toUpperCase()}',
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '${NumberFormat('#,###').format(d.amount)}',
              style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.success),
            ),
            Text(d.status, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          ],
        ),
      ),
    );
  }
}
