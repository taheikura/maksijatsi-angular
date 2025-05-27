from datetime import time
from random import randrange

import factory.fuzzy
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

from ..models import (
    GroupSurveySession,
    KivaUser,
    Language,
    LicencePartnership,
    MultiSelectMultiChoiceAnswer,
    Participant,
    ParticipantGroup,
    ParticipantSurveyAnswer,
    ParticipantSurveySession,
    Partner,
    PeerNominationAnswer,
    PeerRatingAnswer,
    Project,
    Report,
    ReportDataElement,
    ReportElement,
    ReportElementMapping,
    ReportElementQuestionIdentifier,
    ReportUnitGroup,
    School,
    SchoolGroup,
    SchoolMembership,
    Survey,
    SurveyAnswerOption,
    SurveyPage,
    SurveyQuestion,
    SurveyQuestionSet,
    SurveyQuestionType,
    SurveySession,
    SurveyUnit,
    TextAnswer,
    TrendData,
)

UserModel = get_user_model()

NOW = timezone.now()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = UserModel

    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    email = factory.LazyAttribute(
        lambda user: "{}.{}@example.com".format(
            user.first_name.lower(), user.last_name.lower()
        )
    )
    password = "test"

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        manager = cls._get_manager(model_class)
        return manager.create_user(*args, **kwargs)


class KivaUserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = KivaUser

    user = factory.SubFactory(UserFactory)
    school_id = factory.fuzzy.FuzzyText(length=10)


class PartnerFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Partner

    name = factory.Sequence(lambda n: "Partner{}".format(n))
    external_id = factory.fuzzy.random.randgen.randint(0, 100000)
    is_kiva_partner = True


class ProjectFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Project

    name = factory.Sequence(lambda n: "Project{}".format(n))
    active = True
    archived = False


class SchoolFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = School

    name = factory.Sequence(lambda n: "School{}".format(n))
    municipality = factory.Sequence(lambda n: "Municipality{}".format(n))
    school_type = ""


class KiVaSchoolFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = School

    name = factory.Sequence(lambda n: "School{}".format(n))
    municipality = factory.Sequence(lambda n: "Municipality{}".format(n))
    partner = factory.SubFactory(PartnerFactory)


class SchoolMembershipFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SchoolMembership

    user = factory.SubFactory(UserFactory)
    school = factory.SubFactory(SchoolFactory)
    admin = False
    active = True


class LicencePartnershipFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = LicencePartnership

    user = factory.SubFactory(UserFactory)
    partner = factory.SubFactory(PartnerFactory)
    admin = False
    active = True


class ParticipantGroupFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ParticipantGroup

    name = factory.Faker("name")
    identifier = factory.Sequence(lambda n: "Group{}".format(n))
    school = factory.SubFactory(SchoolFactory)
    project = factory.SubFactory(ProjectFactory)

    @factory.post_generation
    def owners(self, create, extracted, **kwargs):
        if not create:
            # Simple build, do nothing.
            return

        if extracted:
            # A list of groups were passed in, use them
            for owner in extracted:
                self.owners.add(owner)


class LanguageFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Language

    name = factory.fuzzy.FuzzyText(length=8)
    name_local = factory.fuzzy.FuzzyText(length=10)
    language_code = settings.LANGUAGES[randrange(0, len(settings.LANGUAGES))][0]
    active_on_school_pages = True


class KivaParticipantGroupFactory(ParticipantGroupFactory):
    school = factory.SubFactory(KiVaSchoolFactory)


class ParticipantFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Participant

    participant_group = factory.SubFactory(ParticipantGroupFactory)
    name = factory.Faker("name")


class SurveyFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Survey

    project = factory.SubFactory(ProjectFactory)
    name = factory.fuzzy.FuzzyText(length=10)
    teacher_instructions = factory.Faker("sentences")
    participant_instructions = factory.Faker("sentences")
    text = factory.Faker("sentences")


class SurveyPageFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SurveyPage

    survey = factory.SubFactory(SurveyFactory)
    caption = factory.fuzzy.FuzzyText()


class SurveyQuestionSetFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SurveyQuestionSet

    page = factory.SubFactory(SurveyPageFactory)
    caption = factory.fuzzy.FuzzyText()


class SurveySessionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SurveySession

    start_time = factory.Faker("past_datetime", start_date="-1h", tzinfo=NOW.tzinfo)
    end_time = factory.Faker("future_datetime", end_date="+4h", tzinfo=NOW.tzinfo)

    # set SurveySession open for every week day
    is_open_on_mondays = True
    is_open_on_tuesdays = True
    is_open_on_wednesdays = True
    is_open_on_thursdays = True
    is_open_on_fridays = True
    is_open_on_saturdays = True
    is_open_on_sundays = True

    # set SurveySession open whole day
    use_daily_open_times = True
    is_open_daily_from = time(0, 0, 0)
    is_open_daily_until = time(23, 59, 59)
    time_limit_for_fill = 0

    survey = factory.SubFactory(SurveyFactory)


class GroupSurveySessionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = GroupSurveySession

    survey = factory.SubFactory(SurveyFactory)
    participant_group = factory.SubFactory(ParticipantGroupFactory)
    start_time = factory.Faker("past_datetime", start_date="-1h", tzinfo=NOW.tzinfo)
    end_time = factory.Faker("future_datetime", end_date="+4h", tzinfo=NOW.tzinfo)
    session = factory.SubFactory(SurveySessionFactory)
    access_code = factory.Faker("text", max_nb_chars=5)


class GroupSurveySessionFactoryWithSchoolCode(GroupSurveySessionFactory):
    school_code = factory.fuzzy.FuzzyText(length=7)
    access_code = factory.fuzzy.FuzzyText(length=4)


class ParticipantSurveySessionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ParticipantSurveySession

    participant = factory.SubFactory(ParticipantFactory)
    survey_session = factory.SubFactory(GroupSurveySessionFactory)
    access_code = factory.Faker("text", max_nb_chars=10)
    last_login = factory.Faker("past_datetime", start_date="-1h", tzinfo=NOW.tzinfo)


class SurveyQuestionTypeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SurveyQuestionType

    name = factory.fuzzy.FuzzyText(length=10)


class SurveyQuestionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SurveyQuestion

    question_type = factory.SubFactory(SurveyQuestionTypeFactory)
    text = factory.Faker("text", max_nb_chars=200)
    question_set = None


class SurveyAnswerOptionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SurveyAnswerOption

    survey_question = factory.SubFactory(SurveyQuestionFactory)


class ParticipantSurveyAnswerFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ParticipantSurveyAnswer

    participant_survey_session = factory.SubFactory(ParticipantSurveySessionFactory)
    survey_question = factory.SubFactory(SurveyQuestionFactory)
    survey_answer = factory.SubFactory(SurveyAnswerOptionFactory)


class PeerNominationAnswerFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = PeerNominationAnswer

    participant_survey_session = factory.SubFactory(ParticipantSurveySessionFactory)
    survey_question = factory.SubFactory(SurveyQuestionFactory)
    no_one_selected = False


class PeerRatingAnswerFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = PeerRatingAnswer

    participant_survey_session = factory.SubFactory(ParticipantSurveySessionFactory)
    survey_question = factory.SubFactory(SurveyQuestionFactory)
    target = factory.SubFactory(ParticipantFactory)


class MultiSelectMultiChoiceAnswerFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = MultiSelectMultiChoiceAnswer


class TextAnswerFactory(ParticipantSurveyAnswerFactory):
    class Meta:
        model = TextAnswer


class ReportFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Report

    name = factory.Faker("text", max_nb_chars=200)


class TrendDataFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TrendData

    survey_session = factory.SubFactory(SurveySessionFactory)
    total_answer_count = factory.fuzzy.random.randgen.randint(0, 10000)
    answers_in_selected_choices = factory.fuzzy.random.randgen.randint(0, 10000)


class ReportElementFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ReportElement

    report = factory.SubFactory(ReportFactory)


class ReportDataElementFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ReportDataElement

    element = factory.SubFactory(ReportElementFactory)


class ReportElementQuestionIdentifierFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ReportElementQuestionIdentifier

    identifier = factory.SubFactory(SurveyQuestionFactory)
    report_element = factory.SubFactory(ReportElementFactory)


class SurveyUnitFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SurveyUnit

    name = factory.fuzzy.FuzzyText(length=10)


class ReportUnitGroupFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ReportUnitGroup

    report = factory.SubFactory(ReportFactory)


class ReportElementMappingFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ReportElementMapping


class SchoolGroupFactory(factory.django.DjangoModelFactory):
    name = factory.fuzzy.FuzzyText(length=10)

    class Meta:
        model = SchoolGroup
