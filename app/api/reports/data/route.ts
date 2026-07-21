import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { auth } from '@clerk/nextjs/server';
import { ReportsService } from '@/services/reportsService';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata?.role as string) || 'staff';

    if (role === 'staff') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { timeRange, startDate, endDate, sections, selectedYear } = body || {};

    const doctorEmail = role === 'doctor' ? user.emailAddresses?.[0]?.emailAddress : undefined;
    const doctorUserId = role === 'doctor' ? userId : undefined;

    const results: Record<string, any> = {};
    const errors: Record<string, string> = {};

    const sectionMap: Record<string, () => Promise<any>> = {
      reportData: () => ReportsService.getReportData(timeRange || 'monthly', startDate, endDate, doctorEmail, doctorUserId),
      doctorPerformance: () => ReportsService.getDoctorPerformance(startDate, endDate, doctorEmail, doctorUserId),
      treatmentTypes: () => ReportsService.getTreatmentTypes(startDate, endDate, doctorEmail, doctorUserId),
      patientStats: () => ReportsService.getPatientStats(startDate, endDate, doctorEmail, doctorUserId),
      patientDemographics: () => ReportsService.getPatientDemographics(startDate, endDate, doctorEmail, doctorUserId),
      revenueStats: () => ReportsService.getRevenueStats(startDate, endDate, doctorEmail, doctorUserId),
      detailedPatientAnalytics: () => ReportsService.getDetailedPatientAnalytics(startDate, endDate, doctorEmail, doctorUserId),
      financialTransactions: () => ReportsService.getFinancialTransactions(startDate, endDate, doctorEmail, doctorUserId),
      allFinancialTransactions: () => ReportsService.getAllFinancialTransactions(doctorEmail, doctorUserId),
      financialSummaryByTreatment: () => ReportsService.getFinancialSummaryByTreatment(startDate, endDate, doctorEmail, doctorUserId),
      paymentStatusSummary: () => ReportsService.getPaymentStatusSummary(doctorEmail, doctorUserId),
    };

    const requestedSections = sections && Array.isArray(sections)
      ? sections.filter((s: string) => s in sectionMap)
      : Object.keys(sectionMap);

    await Promise.allSettled(
      requestedSections.map(async (section: string) => {
        try {
          results[section] = await sectionMap[section]();
        } catch (e) {
          errors[section] = e instanceof Error ? e.message : 'Unknown error';
        }
      })
    );

    return NextResponse.json({ success: true, data: results, errors: Object.keys(errors).length > 0 ? errors : undefined });
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
