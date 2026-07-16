-- GeoAI Demo Project Baseline Seed v1
-- Applied to geoai-dev / pphdqkurxneyagvnnjdt on 2026-07-08.
-- Purpose: persist a demo/project workspace baseline for Preview Supabase runtime.
-- This remains demo/sample data only.

-- Required caveat for all seeded decision records:
-- Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

do $$
declare
  v_org_id uuid;
  v_profile_id uuid;
  v_caveat text := 'Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.';
begin
  insert into public.organizations (name, slug, status, metadata)
  values (
    'GeoAI Demo Organization',
    'geoai-demo',
    'active',
    jsonb_build_object(
      'purpose', 'GeoAI demo/project baseline for persisted workspace testing',
      'dataMode', 'demo_normalized',
      'caveat', v_caveat
    )
  )
  on conflict (slug) do update set
    name = excluded.name,
    status = excluded.status,
    metadata = excluded.metadata,
    updated_at = now()
  returning id into v_org_id;

  select id into v_profile_id
  from public.profiles
  where email = 'geoai-demo-system@geoai.local'
  limit 1;

  if v_profile_id is null then
    insert into public.profiles (email, full_name, metadata)
    values (
      'geoai-demo-system@geoai.local',
      'GeoAI Demo System',
      jsonb_build_object(
        'profileType', 'system_seed',
        'authStatus', 'not_linked_to_auth_user',
        'caveat', 'Seed profile for demo metadata only; not a production identity.'
      )
    )
    returning id into v_profile_id;
  else
    update public.profiles
    set full_name = 'GeoAI Demo System',
        metadata = jsonb_build_object(
          'profileType', 'system_seed',
          'authStatus', 'not_linked_to_auth_user',
          'caveat', 'Seed profile for demo metadata only; not a production identity.'
        ),
        updated_at = now()
    where id = v_profile_id;
  end if;

  insert into public.projects (
    organization_id, project_key, name, description, geography, client_type,
    primary_scenario, status, data_mode, metadata, created_by
  )
  values
    (v_org_id, 'dubai-investment-screening-demo', 'Dubai Investment Screening', 'Fund / family office pilot screening workspace for Dubai site screening, comparison, evidence confidence and investment memo workflow using sample/open data.', 'Dubai / UAE', 'fund', 'investmentSiteSelection', 'demo', 'demo_normalized', jsonb_build_object('audience','b2b','segment','b2b','default',true,'demoPurpose','Compare coastal and growth-area opportunities before underwriting.','dataStatus','Local sample context and open-data style signals; official validation required.','recommendedNextAction','Validate official market, parcel and planning evidence before investment decisions.','caveat',v_caveat), v_profile_id),
    (v_org_id, 'developer-land-pipeline-demo', 'Developer Land Pipeline', 'Developer / master developer pilot screening workspace for land pipeline screening, infrastructure context and planning validation checklist.', 'Dubai / UAE', 'developer', 'realEstateDevelopment', 'demo', 'demo_normalized', jsonb_build_object('audience','b2b','segment','b2b','demoPurpose','Screen development potential and identify validation gaps.','dataStatus','Local sample GeoJSON and CSV context; not official boundaries or planning data.','recommendedNextAction','Request land-use, infrastructure and constraint confirmation from agreed validation sources.','caveat',v_caveat), v_profile_id),
    (v_org_id, 'bank-asset-review-demo', 'Bank Asset Review', 'Bank / lender pilot screening workspace for collateral context, market confidence, spatial exposure and evidence trail review.', 'Dubai / UAE', 'bank', 'assetPortfolioIntelligence', 'demo', 'demo_normalized', jsonb_build_object('audience','b2b','segment','b2b','demoPurpose','Review collateral context and evidence gaps for a lender-ready summary.','dataStatus','Sample/offline metrics and screening spatial context; no live official integration.','recommendedNextAction','Validate source lineage and risk assumptions before credit or collateral decisions.','caveat',v_caveat), v_profile_id),
    (v_org_id, 'home-buyer-neighborhood-demo', 'Home Buyer Neighborhood Fit', 'B2C demo screening workspace for a household comparing Dubai neighborhood fit, access, comfort and validation gaps using sample/open context.', 'Dubai / UAE', 'demo', 'customQuery', 'demo', 'demo_normalized', jsonb_build_object('audience','b2c','segment','b2c','role','home_buyer','demoPurpose','Compare sample neighborhoods for lifestyle fit before personal due diligence.','dataStatus','Local sample/open context only; not official property, parcel, ownership, zoning or valuation evidence.','recommendedNextAction','Validate listings, legal/title, service charges, school/access needs and official planning context before decisions.','caveat',v_caveat), v_profile_id),
    (v_org_id, 'family-relocation-area-demo', 'Family Relocation Area Review', 'B2C demo screening workspace for relocation area comparison, commute, amenities and heat/climate context using sample/open data.', 'Dubai / UAE', 'demo', 'climateRisk', 'demo', 'demo_normalized', jsonb_build_object('audience','b2c','segment','b2c','role','family_relocation','demoPurpose','Review neighborhood trade-offs for a family relocation shortlist.','dataStatus','Sample/open context only; not official planning, school catchment, legal, ownership or valuation evidence.','recommendedNextAction','Validate commute, school, services, building/legal and official municipality context before household decisions.','caveat',v_caveat), v_profile_id)
  on conflict (project_key) do update set
    organization_id = excluded.organization_id,
    name = excluded.name,
    description = excluded.description,
    geography = excluded.geography,
    client_type = excluded.client_type,
    primary_scenario = excluded.primary_scenario,
    status = excluded.status,
    data_mode = excluded.data_mode,
    metadata = excluded.metadata,
    created_by = excluded.created_by,
    updated_at = now();

  insert into public.project_memberships (organization_id, project_id, project_key, user_id, role, status)
  select v_org_id, p.id, p.project_key, v_profile_id, 'owner', 'active'
  from public.projects p
  where p.project_key in (
    'dubai-investment-screening-demo', 'developer-land-pipeline-demo', 'bank-asset-review-demo',
    'home-buyer-neighborhood-demo', 'family-relocation-area-demo'
  )
  on conflict do nothing;

  insert into public.pilot_workflows (
    organization_id, project_id, project_key, title, client_type, use_case,
    geography, decision_question, pilot_stage, owner_id, metadata, caveat
  )
  select
    v_org_id,
    p.id,
    p.project_key,
    p.name || ' Workflow',
    p.client_type,
    p.primary_scenario,
    p.geography,
    case p.project_key
      when 'dubai-investment-screening-demo' then 'Which Dubai locations deserve deeper underwriting before capital is committed?'
      when 'developer-land-pipeline-demo' then 'Which land opportunities deserve planning and infrastructure validation first?'
      when 'bank-asset-review-demo' then 'Which collateral assumptions require official evidence before credit use?'
      when 'home-buyer-neighborhood-demo' then 'Which sample neighborhoods fit a household shortlist before property due diligence?'
      else 'Which relocation areas deserve deeper family fit validation?'
    end,
    'demo_workflow_ready',
    v_profile_id,
    jsonb_build_object('source','geoai_demo_project_baseline_seed_v1','demoOnly',true,'caveat',v_caveat),
    v_caveat
  from public.projects p
  where p.project_key like '%-demo'
  on conflict (project_key) where project_key is not null do update set
    title = excluded.title,
    client_type = excluded.client_type,
    use_case = excluded.use_case,
    geography = excluded.geography,
    decision_question = excluded.decision_question,
    pilot_stage = excluded.pilot_stage,
    owner_id = excluded.owner_id,
    metadata = excluded.metadata,
    caveat = excluded.caveat,
    updated_at = now();

  insert into public.validation_checklist_items (
    organization_id, project_id, project_key, title, category, status, priority,
    description, caveat, created_by
  )
  select v_org_id, p.id, p.project_key, item.title, item.category, item.status,
         item.priority, item.description, v_caveat, v_profile_id
  from public.projects p
  cross join (values
    ('Validate official market/transaction evidence', 'market_evidence', 'required', 'high', 'Validate DLD/Dubai Pulse or client-approved market evidence before any underwriting use.'),
    ('Validate parcel, planning and zoning assumptions', 'official_validation', 'required', 'high', 'Validate official parcel/planning/zoning evidence outside GeoAI before any legal or planning conclusion.'),
    ('Validate ownership/title and legal status outside GeoAI', 'legal_validation', 'required', 'high', 'GeoAI does not verify ownership, title, cadastral status or legal rights.'),
    ('Review source lineage and data freshness', 'source_lineage', 'in_review', 'medium', 'Review source dates, sample/open context and caveats before client-facing use.')
  ) as item(title, category, status, priority, description)
  where p.project_key like '%-demo'
  on conflict (project_key, title) where project_key is not null do update set
    category = excluded.category,
    status = excluded.status,
    priority = excluded.priority,
    description = excluded.description,
    caveat = excluded.caveat,
    created_by = excluded.created_by,
    updated_at = now();

  insert into public.pilot_client_inputs (
    organization_id, project_id, project_key, title, input_type, required,
    status, priority, notes, caveat
  )
  select v_org_id, p.id, p.project_key, item.title, item.input_type, item.required,
         item.status, item.priority, item.notes, v_caveat
  from public.projects p
  cross join (values
    ('Client target sites / AOIs', 'geojson_or_coordinate_list', true, 'needed', 'high', 'User-provided or client-approved shortlist geometry required for non-demo work.'),
    ('Official/customer validation evidence', 'documents_or_data_exports', true, 'needed', 'high', 'Required before any official/legal/planning/valuation use.'),
    ('Decision criteria and weighting', 'structured_requirements', true, 'draft', 'medium', 'Client-specific criteria required before pilot scoring calibration.')
  ) as item(title, input_type, required, status, priority, notes)
  where p.project_key like '%-demo'
  on conflict (project_key, title) where project_key is not null do update set
    input_type = excluded.input_type,
    required = excluded.required,
    status = excluded.status,
    priority = excluded.priority,
    notes = excluded.notes,
    caveat = excluded.caveat,
    updated_at = now();

  insert into public.pilot_deliverables (
    organization_id, project_id, project_key, title, deliverable_type,
    status, next_action, caveat
  )
  select v_org_id, p.id, p.project_key, item.title, item.deliverable_type,
         item.status, item.next_action, v_caveat
  from public.projects p
  cross join (values
    ('Workspace configuration', 'workspace_setup', 'ready_for_demo', 'Connect real client data only after validation-source agreement.'),
    ('Screening memo / report package', 'report', 'browser_print_ready', 'Use browser Print / Save as PDF for demos; server PDF remains later.'),
    ('Validation checklist', 'governance', 'active', 'Track official/client validation evidence before decision use.')
  ) as item(title, deliverable_type, status, next_action)
  where p.project_key like '%-demo'
  on conflict (project_key, title) where project_key is not null do update set
    deliverable_type = excluded.deliverable_type,
    status = excluded.status,
    next_action = excluded.next_action,
    caveat = excluded.caveat,
    updated_at = now();

  insert into public.analysis_runs (
    organization_id, project_id, project_key, run_key, scenario_id,
    selected_name, selected_type, selected_point, selected_object,
    selected_feature_key, input_context, deterministic_scores, result_payload,
    result_json, source_lineage, decision_posture, confidence_level,
    data_confidence_level, analysis_mode, custom_query, project_name,
    created_by, created_at
  )
  select
    v_org_id,
    p.id,
    p.project_key,
    a.run_key,
    a.scenario_id,
    a.selected_name,
    'demo-feature',
    jsonb_build_object('latitude', a.lat, 'longitude', a.lng),
    jsonb_build_object('id', a.feature_key, 'name', a.selected_name, 'type', 'Sample project asset', 'center', jsonb_build_object('latitude', a.lat, 'longitude', a.lng), 'sourceMode', 'seed_static', 'caveat', v_caveat),
    a.feature_key,
    jsonb_build_object('customQuery', a.custom_query, 'sourceMode', 'seed_static', 'projectKey', p.project_key, 'caveat', v_caveat),
    jsonb_build_object('overall', a.score, 'risk', a.risk, 'confidence', 'medium'),
    jsonb_build_object('id', a.run_key, 'title', a.selected_name, 'scenarioId', a.scenario_id, 'point', jsonb_build_object('latitude', a.lat, 'longitude', a.lng), 'summary', a.summary, 'scores', jsonb_build_object('overall', a.score, 'risk', a.risk), 'limitations', jsonb_build_array(v_caveat), 'nextActions', jsonb_build_array('Validate official/client evidence before decisions.'), 'projectKey', p.project_key, 'caveat', v_caveat),
    jsonb_build_object('id', a.run_key, 'title', a.selected_name, 'scenarioId', a.scenario_id, 'point', jsonb_build_object('latitude', a.lat, 'longitude', a.lng), 'summary', a.summary, 'scores', jsonb_build_object('overall', a.score, 'risk', a.risk), 'limitations', jsonb_build_array(v_caveat), 'nextActions', jsonb_build_array('Validate official/client evidence before decisions.'), 'projectKey', p.project_key, 'caveat', v_caveat),
    jsonb_build_object('sourceMode', 'seed_static', 'sources', jsonb_build_array('demo project seed', 'sample/open context'), 'caveat', v_caveat),
    a.decision_posture,
    'medium',
    'Sample example / sample-offline',
    'mock_fallback',
    a.custom_query,
    p.name,
    v_profile_id,
    '2026-06-21T10:00:00Z'::timestamptz
  from public.projects p
  join (values
    ('dubai-investment-screening-demo','seeded-analysis-dubai-marina','investmentSiteSelection','Dubai Marina / JBR Market Signal',25.0822,55.1431,'seed-marina-jbr','Prepared investor walkthrough for Dubai Marina screening.','Proceed with conditions',82,34,'Seeded investment screening context for Dubai Marina / JBR.'),
    ('dubai-investment-screening-demo','seeded-analysis-business-bay-infill','investmentSiteSelection','Business Bay Infill Opportunity',25.1853,55.2685,'seed-business-bay','Evaluate infill opportunity using sample/open context.','Proceed with conditions',78,39,'Seeded investment screening context for Business Bay.'),
    ('developer-land-pipeline-demo','seeded-analysis-dubai-south-growth','realEstateDevelopment','Dubai South Growth Node',24.8887,55.1542,'seed-dubai-south-growth','Review development potential and validation gaps.','Proceed with conditions',80,42,'Seeded developer pipeline context for Dubai South.'),
    ('developer-land-pipeline-demo','seeded-analysis-jvc-jvt-pipeline','realEstateDevelopment','JVC / JVT Residential Pipeline Signal',25.0618,55.2035,'seed-jvc-jvt','Screen residential pipeline signal.','Proceed with conditions',74,45,'Seeded developer pipeline context for JVC / JVT.'),
    ('bank-asset-review-demo','seeded-analysis-mbr-collateral','customQuery','Meydan / MBR City Collateral Review',25.1646,55.3156,'seed-mbr-city','Review collateral context, evidence confidence and lender-facing gaps.','Evidence validation required',70,52,'Seeded collateral context for MBR City.'),
    ('bank-asset-review-demo','seeded-analysis-business-bay-asset-gap','customQuery','Business Bay Asset Evidence Gap',25.1853,55.2685,'seed-business-bay','Identify source gaps before using this asset context in a credit memo.','Evidence validation required',68,55,'Seeded collateral evidence gap context for Business Bay.'),
    ('home-buyer-neighborhood-demo','seeded-analysis-dubai-hills-home-fit','customQuery','Dubai Hills Home Buyer Fit',25.1036,55.2547,'seed-dubai-hills-family-fit','Compare family lifestyle fit, access, heat context and validation gaps before shortlisting homes.','Screening only; validate before decisions',76,38,'Seeded B2C home-buyer context for Dubai Hills.'),
    ('home-buyer-neighborhood-demo','seeded-analysis-creek-harbour-home-fit','investmentSiteSelection','Creek Harbour Waterfront Fit',25.1972,55.3478,'seed-creek-harbour-waterfront-fit','Review neighborhood fit and source limitations for a household shortlist.','Screening only; validate before decisions',73,41,'Seeded B2C home-buyer context for Creek Harbour.'),
    ('family-relocation-area-demo','seeded-analysis-town-square-relocation','climateRisk','Town Square Family Relocation Context',25.0056,55.2862,'seed-town-square-relocation-fit','Review commute, comfort, amenities and validation steps for a family relocation shortlist.','Screening only; validate before decisions',72,44,'Seeded B2C relocation context for Town Square.'),
    ('family-relocation-area-demo','seeded-analysis-dubai-hills-relocation','customQuery','Dubai Hills Relocation Context',25.1036,55.2547,'seed-dubai-hills-family-fit','Compare family relocation fit using sample/open context and explicit official-validation gaps.','Screening only; validate before decisions',75,39,'Seeded B2C relocation context for Dubai Hills.')
  ) as a(project_key, run_key, scenario_id, selected_name, lat, lng, feature_key, custom_query, decision_posture, score, risk, summary)
    on a.project_key = p.project_key
  on conflict (run_key) do update set
    organization_id = excluded.organization_id,
    project_id = excluded.project_id,
    project_key = excluded.project_key,
    scenario_id = excluded.scenario_id,
    selected_name = excluded.selected_name,
    selected_type = excluded.selected_type,
    selected_point = excluded.selected_point,
    selected_object = excluded.selected_object,
    selected_feature_key = excluded.selected_feature_key,
    input_context = excluded.input_context,
    deterministic_scores = excluded.deterministic_scores,
    result_payload = excluded.result_payload,
    result_json = excluded.result_json,
    source_lineage = excluded.source_lineage,
    decision_posture = excluded.decision_posture,
    confidence_level = excluded.confidence_level,
    data_confidence_level = excluded.data_confidence_level,
    analysis_mode = excluded.analysis_mode,
    custom_query = excluded.custom_query,
    project_name = excluded.project_name,
    created_by = excluded.created_by,
    updated_at = now();

  insert into public.comparison_sets (
    organization_id, project_id, project_key, comparison_key, title, item_count,
    items, recommendation, result_payload, payload, source_lineage, created_by, created_at
  )
  select
    v_org_id,
    p.id,
    p.project_key,
    c.comparison_key,
    c.title,
    c.item_count,
    c.items,
    jsonb_build_object('summary', c.recommendation, 'caveat', v_caveat),
    jsonb_build_object('title', c.title, 'winner', c.winner, 'caveat', v_caveat),
    jsonb_build_object('title', c.title, 'winner', c.winner, 'caveat', v_caveat),
    jsonb_build_object('sourceMode', 'seed_static', 'caveat', v_caveat),
    v_profile_id,
    '2026-06-21T10:00:00Z'::timestamptz
  from public.projects p
  join (values
    ('dubai-investment-screening-demo','seeded-comparison-dubai-shortlist','Dubai Marina vs Business Bay vs Dubai South',3,jsonb_build_array('Dubai Marina / JBR Market Signal','Business Bay Infill Opportunity','Dubai South Growth Node'),'Best option: Dubai South Growth Node','Dubai South Growth Node'),
    ('developer-land-pipeline-demo','seeded-comparison-developer-pipeline','Dubai South vs JVC/JVT vs MBR City',3,jsonb_build_array('Dubai South Growth Node','JVC / JVT Residential Pipeline Signal','Meydan / MBR City Collateral Review'),'Best option: Dubai South Growth Node','Dubai South Growth Node'),
    ('bank-asset-review-demo','seeded-comparison-bank-collateral','MBR City vs Business Bay Collateral Context',2,jsonb_build_array('Meydan / MBR City Collateral Review','Business Bay Asset Evidence Gap'),'Best option: Meydan / MBR City Collateral Review','Meydan / MBR City Collateral Review'),
    ('home-buyer-neighborhood-demo','seeded-comparison-home-buyer-neighborhoods','Dubai Hills vs Creek Harbour vs JVC/JVT Neighborhood Fit',3,jsonb_build_array('Dubai Hills Home Buyer Fit','Creek Harbour Waterfront Fit','JVC / JVT Residential Pipeline Signal'),'Best option: Dubai Hills Home Buyer Fit','Dubai Hills Home Buyer Fit'),
    ('family-relocation-area-demo','seeded-comparison-family-relocation-areas','Town Square vs Dubai Hills vs Creek Harbour Relocation Context',3,jsonb_build_array('Town Square Family Relocation Context','Dubai Hills Relocation Context','Creek Harbour Waterfront Fit'),'Best option: Dubai Hills Relocation Context','Dubai Hills Relocation Context')
  ) as c(project_key, comparison_key, title, item_count, items, recommendation, winner)
    on c.project_key = p.project_key
  on conflict (comparison_key) do update set
    organization_id = excluded.organization_id,
    project_id = excluded.project_id,
    project_key = excluded.project_key,
    title = excluded.title,
    item_count = excluded.item_count,
    items = excluded.items,
    recommendation = excluded.recommendation,
    result_payload = excluded.result_payload,
    payload = excluded.payload,
    source_lineage = excluded.source_lineage,
    created_by = excluded.created_by,
    updated_at = now();

  insert into public.reports (
    organization_id, project_id, project_key, report_key, report_type, title,
    summary, payload, report_json, linked_analysis_ids, linked_comparison_id,
    source_lineage, printable_path, project_name, decision_posture,
    generated_by, generated_at
  )
  select
    v_org_id,
    p.id,
    p.project_key,
    r.report_key,
    r.report_type,
    r.title,
    r.summary,
    jsonb_build_object('title', r.title, 'summary', r.summary, 'sourceSummary', r.source_summary, 'caveat', v_caveat),
    jsonb_build_object('title', r.title, 'summary', r.summary, 'sourceSummary', r.source_summary, 'caveat', v_caveat),
    case when r.analysis_run_key is null then '{}'::text[] else array[r.analysis_run_key]::text[] end,
    r.comparison_key,
    jsonb_build_object('sourceMode', 'seed_static', 'sourceSummary', r.source_summary, 'caveat', v_caveat),
    '/reports/' || r.report_key || '/print',
    p.name,
    r.decision_posture,
    v_profile_id,
    '2026-06-21T10:00:00Z'::timestamptz
  from public.projects p
  join (values
    ('dubai-investment-screening-demo','seeded-analysis-dubai-marina-report','analysis','Investment Screening Memo','Dubai Marina / JBR Market Signal memo','Dubai Investment Screening / sample-offline evidence; official validation required.','seeded-analysis-dubai-marina',null,'Proceed with conditions'),
    ('dubai-investment-screening-demo','seeded-comparison-dubai-shortlist-report','comparison','Dubai Marina vs Business Bay vs Dubai South Comparison Memo','Investment shortlist comparison memo','Investment shortlist comparison / sample-offline evidence; official validation required.',null,'seeded-comparison-dubai-shortlist','Best option: Dubai South Growth Node'),
    ('developer-land-pipeline-demo','seeded-analysis-dubai-south-development-report','analysis','Development Screening Memo','Dubai South development screening memo','Developer Land Pipeline / sample planning context; official validation required.','seeded-analysis-dubai-south-growth',null,'Proceed with conditions'),
    ('developer-land-pipeline-demo','seeded-comparison-developer-pipeline-report','comparison','Dubai South vs JVC/JVT vs MBR City Development Memo','Developer pipeline comparison memo','Developer pipeline comparison / sample evidence; official validation required.',null,'seeded-comparison-developer-pipeline','Best option: Dubai South Growth Node'),
    ('bank-asset-review-demo','seeded-analysis-mbr-collateral-report','analysis','Collateral Context Memo','MBR City collateral context memo','Bank Asset Review / evidence confidence review; official validation required.','seeded-analysis-mbr-collateral',null,'Evidence validation required'),
    ('bank-asset-review-demo','seeded-comparison-bank-collateral-report','comparison','MBR City vs Business Bay Collateral Context Memo','Collateral evidence comparison memo','Bank collateral context comparison / source confidence review; official validation required.',null,'seeded-comparison-bank-collateral','Best option: Meydan / MBR City Collateral Review'),
    ('home-buyer-neighborhood-demo','seeded-analysis-dubai-hills-home-fit-report','analysis','Home Buyer Neighborhood Fit Memo','Dubai Hills home-buyer fit memo','Home Buyer Neighborhood Fit / sample-open context; official validation required.','seeded-analysis-dubai-hills-home-fit',null,'Screening only; validate before decisions'),
    ('home-buyer-neighborhood-demo','seeded-comparison-home-buyer-neighborhoods-report','comparison','Dubai Hills vs Creek Harbour vs JVC/JVT Neighborhood Fit Memo','B2C neighborhood comparison memo','B2C home-buyer comparison / sample-open context; official validation required.',null,'seeded-comparison-home-buyer-neighborhoods','Best option: Dubai Hills Home Buyer Fit'),
    ('family-relocation-area-demo','seeded-analysis-town-square-relocation-report','analysis','Family Relocation Area Review Memo','Town Square relocation context memo','Family Relocation Area Review / sample-open context; official validation required.','seeded-analysis-town-square-relocation',null,'Screening only; validate before decisions'),
    ('family-relocation-area-demo','seeded-comparison-family-relocation-areas-report','comparison','Town Square vs Dubai Hills vs Creek Harbour Relocation Memo','B2C relocation comparison memo','B2C relocation comparison / sample-open context; official validation required.',null,'seeded-comparison-family-relocation-areas','Best option: Dubai Hills Relocation Context')
  ) as r(project_key, report_key, report_type, title, summary, source_summary, analysis_run_key, comparison_key, decision_posture)
    on r.project_key = p.project_key
  on conflict (report_key) do update set
    organization_id = excluded.organization_id,
    project_id = excluded.project_id,
    project_key = excluded.project_key,
    report_type = excluded.report_type,
    title = excluded.title,
    summary = excluded.summary,
    payload = excluded.payload,
    report_json = excluded.report_json,
    linked_analysis_ids = excluded.linked_analysis_ids,
    linked_comparison_id = excluded.linked_comparison_id,
    source_lineage = excluded.source_lineage,
    printable_path = excluded.printable_path,
    project_name = excluded.project_name,
    decision_posture = excluded.decision_posture,
    generated_by = excluded.generated_by,
    updated_at = now();

  insert into public.data_room_assets (
    organization_id, project_id, project_key, name, description, asset_type,
    source_type, validation_status, linked_analysis_ids, linked_report_ids,
    metadata, caveat, created_by
  )
  select
    v_org_id,
    p.id,
    p.project_key,
    r.title,
    r.summary,
    r.report_type,
    'generated_by_geoai_seed',
    'ready_for_review',
    r.linked_analysis_ids,
    array[r.report_key]::text[],
    jsonb_build_object('source', 'geoai_demo_project_baseline_seed_v1', 'printablePath', r.printable_path, 'caveat', v_caveat),
    v_caveat,
    v_profile_id
  from public.reports r
  join public.projects p on p.project_key = r.project_key
  where r.report_key like 'seeded-%'
  on conflict (project_key, name, asset_type) where project_key is not null do update set
    description = excluded.description,
    source_type = excluded.source_type,
    validation_status = excluded.validation_status,
    linked_analysis_ids = excluded.linked_analysis_ids,
    linked_report_ids = excluded.linked_report_ids,
    metadata = excluded.metadata,
    caveat = excluded.caveat,
    created_by = excluded.created_by,
    updated_at = now();

  update public.source_registry_snapshots
  set organization_id = coalesce(organization_id, v_org_id),
      caveat = coalesce(caveat, v_caveat),
      updated_at = now()
  where organization_id is null;

  update public.external_data_snapshots
  set organization_id = coalesce(organization_id, v_org_id),
      updated_at = now()
  where organization_id is null;

  insert into public.audit_events (organization_id, actor_user_id, event_type, entity_type, entity_id, action, metadata)
  values (
    v_org_id,
    v_profile_id,
    'project_updated',
    'database_baseline',
    'geoai_demo_project_baseline_seed_v1',
    'Applied GeoAI demo project baseline seed',
    jsonb_build_object(
      'migration', 'geoai_demo_project_baseline_seed_v1',
      'projectsSeeded', 5,
      'dataMode', 'demo_normalized',
      'caveat', v_caveat
    )
  );
end $$;
