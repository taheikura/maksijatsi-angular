import os
from datetime import datetime
from pathlib import Path
from random import choice
from string import ascii_uppercase

import pytest
from django.core import management
from django.test import RequestFactory
from django.utils import timezone
from freezegun import freeze_time

from ...common.management.commands.export_all_nominations_data import (
    get_all_rating_data,
)
from ...common.models import (
    GroupSurveySession,
    Participant,
    ParticipantSurveySession,
    PeerNominationAnswer,
    SurveyQuestion,
    SurveySessionDataFile,
)
from ..utils import remove_file_from_filesystem
from ..views import data_matrix_generator, ExportAnswersDataView, get_raw_data_row
from .factories import (
    GroupSurveySessionFactory,
    ParticipantFactory,
    ParticipantSurveySessionFactory,
    PeerRatingAnswerFactory,
    SurveyAnswerOptionFactory,
    SurveyFactory,
    SurveyPageFactory,
    SurveyQuestionFactory,
    SurveyQuestionSetFactory,
    SurveyQuestionTypeFactory,
    SurveySessionFactory,
    UserFactory,
)

PLACE_OF_GIVEN_RATINGS_AVG = -1
PLACE_OF_RECEIVED_RATINGS_AVG = -2
NO_CONSENT_VALUE = PeerNominationAnswer.NO_CONSENT_VALUE
NO_PARTICIPANT_PRESENT_VALUE = PeerNominationAnswer.NO_PARTICIPANT_PRESENT_VALUE


def generate_unique_random_access_codes(count: int):
    """
    Gives unique wanted amount of unique ParticipantSurveySession access_codes
    """
    group_code = "".join(choice(ascii_uppercase) for _ in range(5))
    codes = []
    while len(codes) < count:
        candidate = ParticipantSurveySession.generate_code(group_code)[5:]
        if candidate not in codes:
            codes.append(candidate)

    return codes


@freeze_time("2020-01-01")
@pytest.mark.django_db
def test_peer_ratings_exports():
    """
    Test 'raw data' and 'data matrix' exports for Peer rating questions

    4 participants for matric, 3 participant for noise

    First, tests exports without answers
    Then, tests exports with answers

    """
    view = ExportAnswersDataView()
    request = RequestFactory().get("exports")
    request.user = UserFactory(is_staff=True)
    view.setup(request)

    # create objects needed
    question_type = SurveyQuestionTypeFactory(name="Peer rating")

    survey = SurveyFactory(name="Test ABC")
    survey_session = SurveySessionFactory(survey=survey)
    group_session = GroupSurveySessionFactory(survey=survey, session=survey_session)
    page = SurveyPageFactory(survey=survey)
    question_set = SurveyQuestionSetFactory(
        page=page
    )  # note that tests still uses page, not pages
    question_set.pages.add(page)
    question = SurveyQuestionFactory(
        question_type=question_type,
        question_set=question_set,
        identifier="TEST_IDENTIFIER",
    )

    assert question.question_set.pages.first().survey
    assert question.question_set.pages.first().survey == group_session.survey

    group = group_session.participant_group
    now = timezone.now()
    access_codes = generate_unique_random_access_codes(3)

    # add noise #1, teacher
    ParticipantFactory(
        research_permission=True,
        participant_group=group,
        is_teacher=True,
    )
    # add noise #2, parent
    ParticipantFactory(
        research_permission=True,
        participant_group=group,
        is_parent=True,
    )
    # add noise #3, participant added after survey end time to group
    added_later = ParticipantSurveySessionFactory(
        participant=ParticipantFactory(
            research_permission=True,
            participant_group=group,
        ),
        survey_session=group_session,
        created=datetime(2022, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
    )
    assert added_later.created > group_session.end_time

    participant_no_consent = ParticipantFactory(
        research_permission=False, participant_group=group
    )
    participant_session_no_consent = ParticipantSurveySessionFactory(
        participant=participant_no_consent,
        survey_session=group_session,
        last_login=now,
        access_code=access_codes[0],
    )

    participant_no_present = ParticipantFactory(
        research_permission=True, participant_group=group
    )
    # no session for this participant
    participant_with_consent = ParticipantFactory(
        research_permission=True, participant_group=group
    )
    participant_session_with_consent = ParticipantSurveySessionFactory(
        participant=participant_with_consent,
        survey_session=group_session,
        last_login=now,
        access_code=access_codes[1],
    )

    participant_with_no_one_selected = ParticipantFactory(
        research_permission=True, participant_group=group
    )
    participant_session_with_no_one_selected = ParticipantSurveySessionFactory(
        participant=participant_with_no_one_selected,
        survey_session=group_session,
        last_login=now,
        access_code=access_codes[2],
    )
    assert (
        Participant.objects.filter(is_teacher=False, is_parent=False).count() == 4 + 2
    )  # there is "default participant in migration"

    # --- test data matrix before answers
    header_row = [
        "",
        participant_no_consent.id,
        participant_no_present.id,
        participant_with_consent.id,
        participant_with_no_one_selected.id,
    ]

    matrix_before_answers = [
        header_row,
        [
            participant_no_consent.id,
            "",
            NO_CONSENT_VALUE,
            NO_CONSENT_VALUE,
            NO_CONSENT_VALUE,
        ],
        [
            participant_no_present.id,
            NO_PARTICIPANT_PRESENT_VALUE,
            "",
            NO_PARTICIPANT_PRESENT_VALUE,
            NO_PARTICIPANT_PRESENT_VALUE,
        ],
        [
            participant_with_consent.id,
            NO_PARTICIPANT_PRESENT_VALUE,
            NO_PARTICIPANT_PRESENT_VALUE,
            "",
            NO_PARTICIPANT_PRESENT_VALUE,
        ],
        [
            participant_with_no_one_selected.id,
            NO_PARTICIPANT_PRESENT_VALUE,
            NO_PARTICIPANT_PRESENT_VALUE,
            NO_PARTICIPANT_PRESENT_VALUE,
            "",
        ],
    ]

    assert ParticipantSurveySession.objects.count() == 3 + 1
    assert GroupSurveySession.objects.count() == 1
    assert group_session.participant_group.participants.count() == 4 + 3

    generated_matrix = list(data_matrix_generator(group_session, question))
    assert generated_matrix == matrix_before_answers

    # --- generate answers
    options = [
        SurveyAnswerOptionFactory(
            survey_question=question,
            order=i,
            position=i,
        )
        for i in range(3)
    ]

    PeerRatingAnswerFactory(
        survey_question=question,
        participant_survey_session=participant_session_no_consent,
        target=participant_with_consent,
        survey_answer=options[0],
    ),
    PeerRatingAnswerFactory(
        survey_question=question,
        participant_survey_session=participant_session_with_no_one_selected,
        target=participant_no_consent,
        survey_answer=options[1],
    ),
    # no answer for participant_no_present
    PeerRatingAnswerFactory(
        survey_question=question,
        participant_survey_session=participant_session_with_consent,
        target=participant_with_no_one_selected,
        survey_answer=options[2],
    ),

    question_units = view.get_units_of_questions(
        questions=SurveyQuestion.objects.all(), session=survey_session
    )
    # --- test raw data rows with answers
    for participant in [
        participant_session_no_consent,
        participant_session_with_consent,
        participant_session_with_no_one_selected,
    ]:
        row = get_raw_data_row(
            group_session.session,
            participant,
            survey_session.survey.has_unit_defining_question(),
            question_units,
            questions=SurveyQuestion.objects.all(),
        )
        if participant == participant_session_no_consent:
            assert round(row[PLACE_OF_RECEIVED_RATINGS_AVG]) == 2
            assert round(row[PLACE_OF_GIVEN_RATINGS_AVG]) == 1
        elif participant == participant_session_with_no_one_selected:
            assert round(row[PLACE_OF_RECEIVED_RATINGS_AVG]) == 3
            assert round(row[PLACE_OF_GIVEN_RATINGS_AVG]) == 2
        elif participant == participant_session_with_consent:
            assert round(row[PLACE_OF_RECEIVED_RATINGS_AVG]) == 1
            assert round(row[PLACE_OF_GIVEN_RATINGS_AVG]) == 3

    # --- test SurveySessionDataFile creation
    with freeze_time("2020-01-03 00:00:00+00:00"):
        management.call_command("create_export_files")

    assert (
        SurveySessionDataFile.objects.all().count() == 2
    )  # raw data and data matrices zip

    raw_data_obj = (
        SurveySessionDataFile.objects.first()
    )  # raw data is generated first, then matrices

    matrix_obj = (
        SurveySessionDataFile.objects.last()
    )  # raw data is generated first, then matrices

    assert raw_data_obj.session == matrix_obj.session == group_session.session
    assert raw_data_obj.export_type == "RAW"
    assert matrix_obj.export_type == "Peer rating".upper()

    data_file_name = raw_data_obj.data_file

    # check that the raw data CSV file exists
    assert os.path.isfile(data_file_name)

    exports_folder = Path.cwd() / "survey_data_exports" / str(group_session.session.id)

    raw_file_name = f"raw_data__session_{group_session.session.id}_2020-01-03_0000.csv"
    assert str(data_file_name) == str(exports_folder / raw_file_name)
    remove_file_from_filesystem(data_file_name)

    # check that the data matrix file exists
    matrix_data_file_name = exports_folder / matrix_obj.data_file
    assert os.path.isfile(matrix_data_file_name)

    file_name = "data_matrices__session_{}_TEST_IDENTIFIER_2020-01-03_0000.zip".format(
        survey_session.id
    )
    assert str(matrix_data_file_name) == str(exports_folder / file_name)
    remove_file_from_filesystem(matrix_data_file_name)

    filenames, sessions = get_all_rating_data()
    assert filenames[0] == f"peer_rating__question_{question.id}__TEST_IDENTIFIER.csv"
    assert len(sessions[0]) == 2

    row1 = ",".join(str(val) for val in sessions[0][0])
    row2 = ",".join(str(val) for val in sessions[0][1])
    assert (
        row1 == f"{participant_with_consent.id},True,{group_session.session.id},None,"
        f"{group.id},{group.school.id},{options[2].order},{participant_with_no_one_selected.id}"
    )
    assert (
        row2
        == f"{participant_with_no_one_selected.id},True,{group_session.session.id},None,"
        f"{group.id},{group.school.id},{options[1].order},{participant_no_consent.id}"
    )
